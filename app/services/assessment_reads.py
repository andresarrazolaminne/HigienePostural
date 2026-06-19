"""Construcción de respuestas API de assessments según rol."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.orden_aseo import orden_aseo_from_raw
from app.core.review_status import PENDING, REVIEWED
from app.models.assessment import Assessment
from app.models.user import User
from app.schemas.assessment import AssessmentDetailRead, AssessmentListItem
from app.schemas.expert_review import (
    AssessmentAiSnapshot,
    AssessmentDetailExpertRead,
    AssessmentReviewState,
)
from app.services.assessment_effective import (
    get_effective_primary_issue,
    get_effective_score,
    get_effective_vision_raw,
    is_expert_reviewed,
)
from app.services.storage_service import get_storage_service


def image_url(image_path: str) -> str | None:
    return get_storage_service().public_url(image_path)


def list_item_for_user(a: Assessment, *, viewer: User) -> AssessmentListItem:
    show_effective_only = viewer.role.value == "user"
    if show_effective_only and is_expert_reviewed(a):
        score = get_effective_score(a)
        issue = get_effective_primary_issue(a)
        provisional = False
    elif show_effective_only and a.review_status == PENDING:
        score = a.calculated_score
        issue = a.primary_issue
        provisional = a.processing_status == "completed"
    else:
        score = get_effective_score(a) if is_expert_reviewed(a) else a.calculated_score
        issue = get_effective_primary_issue(a) if is_expert_reviewed(a) else a.primary_issue
        provisional = False

    vision_raw = get_effective_vision_raw(a) if is_expert_reviewed(a) else (a.raw_ai_json or {})
    orden = orden_aseo_from_raw(vision_raw)

    return AssessmentListItem(
        id=a.id,
        session_id=a.session_id,
        site_id=a.work_session.site_id if a.work_session else None,
        calculated_score=score,
        primary_issue=issue,
        processing_status=a.processing_status,
        processing_error=a.processing_error,
        created_at=a.created_at,
        has_professional_notes=bool(a.professional_notes and a.professional_notes.strip()),
        image_url=image_url(a.image_path),
        orden_aseo_score=orden["orden_aseo_score"],
        orden_aseo_issue=orden["orden_aseo_issue"],
        review_status=a.review_status,
        expert_reviewed=is_expert_reviewed(a),
        score_is_provisional=provisional,
    )


def detail_for_user(db: Session, a: Assessment, *, viewer: User) -> AssessmentDetailRead | AssessmentDetailExpertRead:
    if viewer.role.value in ("super_admin", "company_admin", "expert"):
        return expert_detail(db, a, viewer=viewer)
    base = list_item_for_user(a, viewer=viewer)
    orden = orden_aseo_from_raw(
        get_effective_vision_raw(a) if is_expert_reviewed(a) else (a.raw_ai_json or {})
    )
    author_name: str | None = None
    if a.notes_author_id is not None:
        author = db.get(User, a.notes_author_id)
        author_name = author.name if author else None

    return AssessmentDetailRead(
        **base.model_dump(),
        orden_aseo_observations=orden["orden_aseo_observations"],
        raw_ai_json=None,
        processed_at=a.processed_at,
        professional_notes=a.professional_notes,
        notes_updated_at=a.notes_updated_at,
        notes_author_name=author_name,
    )


def expert_detail(db: Session, a: Assessment, *, viewer: User) -> AssessmentDetailExpertRead:
    base = list_item_for_user(a, viewer=viewer)
    eff_vision = get_effective_vision_raw(a)
    orden_eff = orden_aseo_from_raw(eff_vision)
    orden_ai = orden_aseo_from_raw(a.raw_ai_json or {})

    author_name: str | None = None
    if a.notes_author_id is not None:
        author = db.get(User, a.notes_author_id)
        author_name = author.name if author else None

    reviewed_by_name: str | None = None
    if a.reviewed_by_id is not None:
        reviewer = db.get(User, a.reviewed_by_id)
        reviewed_by_name = reviewer.name if reviewer else None

    return AssessmentDetailExpertRead(
        id=a.id,
        session_id=a.session_id,
        site_id=a.work_session.site_id if a.work_session else None,
        calculated_score=base.calculated_score,
        primary_issue=base.primary_issue,
        processing_status=a.processing_status,
        processing_error=a.processing_error,
        created_at=a.created_at,
        has_professional_notes=bool(a.professional_notes and a.professional_notes.strip()),
        image_url=base.image_url,
        orden_aseo_score=orden_eff["orden_aseo_score"],
        orden_aseo_issue=orden_eff["orden_aseo_issue"],
        orden_aseo_observations=orden_eff["orden_aseo_observations"],
        review_status=a.review_status,
        expert_reviewed=is_expert_reviewed(a),
        score_is_provisional=base.score_is_provisional,
        processed_at=a.processed_at,
        professional_notes=a.professional_notes,
        notes_updated_at=a.notes_updated_at,
        notes_author_name=author_name,
        ai=AssessmentAiSnapshot(
            calculated_score=a.calculated_score,
            primary_issue=a.primary_issue,
            vision=a.raw_ai_json,
        ),
        review=AssessmentReviewState(
            status=a.review_status,
            expert_calculated_score=a.expert_calculated_score,
            expert_primary_issue=a.expert_primary_issue,
            expert_vision_patch=a.expert_vision_patch,
            expert_review_notes=a.expert_review_notes,
            reviewed_at=a.reviewed_at,
            reviewed_by_name=reviewed_by_name,
        ),
    )
