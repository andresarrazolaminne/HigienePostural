"""Valores efectivos (post-revisión experto) y recálculo de métricas de sesión."""

from __future__ import annotations

import statistics
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.processing_status import COMPLETED
from app.core.review_status import APPROVED, CORRECTED, PENDING, REVIEWED
from app.models.assessment import Assessment
from app.models.user import User
from app.models.work_session import WorkSession


def is_expert_reviewed(assessment: Assessment) -> bool:
    return assessment.review_status in REVIEWED


def get_effective_score(assessment: Assessment) -> float | None:
    if assessment.processing_status != COMPLETED:
        return assessment.calculated_score
    if is_expert_reviewed(assessment) and assessment.expert_calculated_score is not None:
        return float(assessment.expert_calculated_score)
    return assessment.calculated_score


def get_effective_primary_issue(assessment: Assessment) -> str | None:
    if assessment.processing_status != COMPLETED:
        return assessment.primary_issue
    if is_expert_reviewed(assessment) and assessment.expert_primary_issue:
        return assessment.expert_primary_issue
    return assessment.primary_issue


def get_effective_vision_raw(assessment: Assessment) -> dict[str, Any]:
    base = dict(assessment.raw_ai_json or {})
    if is_expert_reviewed(assessment) and assessment.expert_vision_patch:
        base.update(assessment.expert_vision_patch)
    return base


def recalculate_session_metrics(db: Session, session_id: int) -> None:
    ws = db.get(WorkSession, session_id)
    if ws is None:
        return
    user = db.get(User, ws.user_id)
    if user is None:
        return

    assessments = db.scalars(
        select(Assessment)
        .where(
            Assessment.session_id == session_id,
            Assessment.processing_status == COMPLETED,
        )
        .order_by(Assessment.id.asc())
    ).all()

    scores: list[float] = []
    for a in assessments:
        s = get_effective_score(a)
        if s is not None:
            scores.append(float(s))

    ws.average_score = float(statistics.mean(scores)) if scores else None

    if not assessments:
        ws.differential_score = None
        db.flush()
        return

    last = assessments[-1]
    last_score = get_effective_score(last)
    if last_score is None:
        ws.differential_score = None
        db.flush()
        return

    if user.baseline_score is not None:
        ws.differential_score = float(last_score) - float(user.baseline_score)
    elif len(assessments) > 1:
        prev = assessments[-2]
        prev_score = get_effective_score(prev)
        if prev_score is not None:
            ws.differential_score = float(last_score) - float(prev_score)
        else:
            ws.differential_score = 0.0
    else:
        ws.differential_score = 0.0

    db.flush()


def apply_expert_review(
    assessment: Assessment,
    *,
    action: str,
    reviewer_id: int,
    calculated_score: float | None = None,
    primary_issue: str | None = None,
    vision_patch: dict[str, Any] | None = None,
    review_notes: str | None = None,
) -> None:
    if assessment.calculated_score is None or assessment.primary_issue is None:
        raise ValueError("El informe aún no tiene salida de IA")

    ai_score = float(assessment.calculated_score)
    ai_issue = assessment.primary_issue.strip()

    if action == "approve":
        assessment.expert_calculated_score = calculated_score if calculated_score is not None else ai_score
        assessment.expert_primary_issue = (
            primary_issue.strip() if primary_issue else ai_issue
        )
        assessment.expert_vision_patch = vision_patch if vision_patch else None
        assessment.review_status = APPROVED
    elif action == "correct":
        if calculated_score is None and primary_issue is None and not vision_patch:
            raise ValueError("Corrección requiere al menos un campo a ajustar")
        assessment.expert_calculated_score = calculated_score if calculated_score is not None else ai_score
        assessment.expert_primary_issue = (
            primary_issue.strip() if primary_issue else ai_issue
        )
        assessment.expert_vision_patch = vision_patch
        assessment.review_status = CORRECTED
    else:
        raise ValueError("action debe ser approve o correct")

    notes = review_notes.strip() if review_notes else None
    assessment.expert_review_notes = notes if notes else None
    assessment.reviewed_at = datetime.now(timezone.utc)
    assessment.reviewed_by_id = reviewer_id
