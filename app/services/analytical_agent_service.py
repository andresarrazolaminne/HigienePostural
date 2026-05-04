from __future__ import annotations

import statistics
from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
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
            .where(Assessment.session_id == ctx.session_id)
            .order_by(Assessment.id.desc())
            .limit(1)
        ).first()
        intra_delta: float | None = None
        if prev_same_session is not None:
            intra_delta = calculated - float(prev_same_session.calculated_score)

        inter_delta: float | None = None
        if user.baseline_score is not None:
            inter_delta = calculated - float(user.baseline_score)

        prev_any = db.scalars(
            select(Assessment)
            .where(Assessment.session_id.in_(select(WorkSession.id).where(WorkSession.user_id == ctx.user_id)))
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
        )
        db.add(assessment)
        db.flush()

        all_scores = db.scalars(
            select(Assessment.calculated_score).where(Assessment.session_id == ctx.session_id)
        ).all()
        avg = float(statistics.mean(all_scores)) if all_scores else None

        if user.baseline_score is not None:
            session_diff = calculated - float(user.baseline_score)
        elif intra_delta is not None:
            session_diff = intra_delta
        else:
            session_diff = 0.0

        ws.average_score = avg
        ws.differential_score = session_diff

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
        )

    def aggregate_for_user(self, db: Session, user_id: int) -> dict[str, Any]:
        """Utilidad para dashboards: promedio histórico de assessments del usuario."""
        avg = db.scalar(
            select(func.avg(Assessment.calculated_score)).where(
                Assessment.session_id.in_(select(WorkSession.id).where(WorkSession.user_id == user_id))
            )
        )
        return {"historical_average_score": float(avg) if avg is not None else None}
