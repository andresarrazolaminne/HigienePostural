from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.processing_status import COMPLETED
from app.core.review_status import PENDING
from app.models.assessment import Assessment
from app.services.assessment_effective import get_effective_score, recalculate_session_metrics
from app.models.user import User
from app.models.work_session import WorkSession
from app.schemas.assessment import AssessmentUploadResponse
from app.schemas.vision import VisionAnalysisResult


@dataclass
class PersistContext:
    user_id: int
    session_id: int
    image_path: str
    vision: VisionAnalysisResult


class AnalyticalAgentService:
    def process_and_persist(self, db: Session, ctx: PersistContext) -> AssessmentUploadResponse:
        user = db.get(User, ctx.user_id)
        if user is None:
            raise ValueError("Usuario no encontrado")
        ws = db.get(WorkSession, ctx.session_id)
        if ws is None or ws.user_id != ctx.user_id:
            raise ValueError("Sesión inválida")

        calculated = float(ctx.vision.overall_risk_score)
        primary = ctx.vision.primary_issue.strip() or "Sin descripción"

        prev_same_session = db.scalars(
            select(Assessment)
            .where(
                Assessment.session_id == ctx.session_id,
                Assessment.processing_status == COMPLETED,
            )
            .order_by(Assessment.id.desc())
            .limit(1)
        ).first()
        intra_delta: float | None = None
        inter_delta: float | None = None
        if user.baseline_score is not None:
            inter_delta = calculated - float(user.baseline_score)

        prev_any = db.scalars(
            select(Assessment)
            .where(
                Assessment.session_id.in_(select(WorkSession.id).where(WorkSession.user_id == ctx.user_id)),
                Assessment.processing_status == COMPLETED,
            )
            .order_by(Assessment.id.desc())
            .limit(1)
        ).first()
        if user.baseline_score is None and prev_any is None:
            user.baseline_score = calculated

        assessment = Assessment(
            session_id=ctx.session_id,
            image_path=ctx.image_path,
            raw_ai_json=ctx.vision.model_dump(),
            calculated_score=calculated,
            primary_issue=primary,
            processing_status=COMPLETED,
            processed_at=datetime.now(timezone.utc),
            review_status=PENDING,
        )
        db.add(assessment)
        db.flush()

        if prev_same_session is not None:
            prev_eff = get_effective_score(prev_same_session)
            if prev_eff is not None:
                intra_delta = calculated - float(prev_eff)

        recalculate_session_metrics(db, ctx.session_id)
        db.refresh(ws)

        db.commit()
        db.refresh(assessment)
        db.refresh(ws)

        return AssessmentUploadResponse(
            assessment_id=assessment.id,
            session_id=ws.id,
            calculated_score=calculated,
            primary_issue=primary,
            session_average_score=ws.average_score,
            session_differential_score=ws.differential_score,
            intra_session_delta=intra_delta,
            inter_session_delta=inter_delta,
            vision=ctx.vision,
            orden_aseo_score=float(ctx.vision.orden_aseo_score),
            orden_aseo_issue=ctx.vision.orden_aseo_issue.strip(),
            orden_aseo_observations=list(ctx.vision.orden_aseo_observations),
        )

    def finalize_assessment(
        self,
        db: Session,
        *,
        assessment_id: int,
        vision: VisionAnalysisResult,
    ) -> AssessmentUploadResponse:
        assessment = db.scalars(
            select(Assessment)
            .where(Assessment.id == assessment_id)
            .options(joinedload(Assessment.work_session))
        ).first()
        if assessment is None:
            raise ValueError("Evaluación no encontrada")
        ws = assessment.work_session
        if ws is None:
            raise ValueError("Sesión no encontrada")
        user = db.get(User, ws.user_id)
        if user is None:
            raise ValueError("Usuario no encontrado")

        calculated = float(vision.overall_risk_score)
        primary = vision.primary_issue.strip() or "Sin descripción"

        prev_same_session = db.scalars(
            select(Assessment)
            .where(
                Assessment.session_id == ws.id,
                Assessment.processing_status == COMPLETED,
                Assessment.id != assessment.id,
            )
            .order_by(Assessment.id.desc())
            .limit(1)
        ).first()
        intra_delta: float | None = None
        if prev_same_session is not None:
            prev_eff = get_effective_score(prev_same_session)
            if prev_eff is not None:
                intra_delta = calculated - float(prev_eff)

        inter_delta: float | None = None
        if user.baseline_score is not None:
            inter_delta = calculated - float(user.baseline_score)

        prev_any = db.scalars(
            select(Assessment)
            .where(
                Assessment.session_id.in_(select(WorkSession.id).where(WorkSession.user_id == user.id)),
                Assessment.processing_status == COMPLETED,
                Assessment.id != assessment.id,
            )
            .order_by(Assessment.id.desc())
            .limit(1)
        ).first()
        if user.baseline_score is None and prev_any is None:
            user.baseline_score = calculated

        assessment.raw_ai_json = vision.model_dump()
        assessment.calculated_score = calculated
        assessment.primary_issue = primary
        assessment.processing_status = COMPLETED
        assessment.processing_error = None
        assessment.processed_at = datetime.now(timezone.utc)
        assessment.review_status = PENDING

        recalculate_session_metrics(db, ws.id)
        db.refresh(ws)

        db.commit()
        db.refresh(assessment)
        db.refresh(ws)

        return AssessmentUploadResponse(
            assessment_id=assessment.id,
            session_id=ws.id,
            calculated_score=calculated,
            primary_issue=primary,
            session_average_score=ws.average_score,
            session_differential_score=ws.differential_score,
            intra_session_delta=intra_delta,
            inter_session_delta=inter_delta,
            vision=vision,
            orden_aseo_score=float(vision.orden_aseo_score),
            orden_aseo_issue=vision.orden_aseo_issue.strip(),
            orden_aseo_observations=list(vision.orden_aseo_observations),
        )

    def aggregate_for_user(self, db: Session, user_id: int) -> dict[str, Any]:
        """Utilidad para dashboards: promedio histórico de assessments del usuario."""
        avg = db.scalar(
            select(func.avg(Assessment.calculated_score)).where(
                Assessment.session_id.in_(select(WorkSession.id).where(WorkSession.user_id == user_id))
            )
        )
        return {"historical_average_score": float(avg) if avg is not None else None}
