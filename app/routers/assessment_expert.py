"""Endpoints de cola y revisión experta."""

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.deps import CurrentUser, DbSession
from app.core.permissions import (
    assert_expert_can_access_company,
    expert_company_ids,
    is_company_admin,
    is_expert,
    is_super_admin,
    require_company_id,
)
from app.core.processing_status import COMPLETED
from app.core.review_status import PENDING
from app.models.assessment import Assessment
from app.models.company import Company
from app.models.site import Site
from app.models.user import User
from app.models.work_session import WorkSession
from app.routers.assessment_access import can_expert_review
from app.schemas.expert_review import AssessmentReviewQueueItem, ExpertReviewUpdate
from app.schemas.expert_review import AssessmentDetailExpertRead
from app.services.assessment_effective import apply_expert_review, recalculate_session_metrics
from app.services.assessment_reads import expert_detail, image_url
router = APIRouter()


@router.get("/review-queue", response_model=list[AssessmentReviewQueueItem])
def review_queue(
    db: DbSession,
    current_user: CurrentUser,
    company_id: int | None = None,
    site_id: int | None = None,
    status: str = Query(PENDING, description="pending | approved | corrected"),
) -> list[AssessmentReviewQueueItem]:
    if not is_expert(current_user) and not is_super_admin(current_user) and not is_company_admin(current_user):
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    stmt = (
        select(Assessment)
        .join(WorkSession, Assessment.session_id == WorkSession.id)
        .outerjoin(Site, WorkSession.site_id == Site.id)
        .where(
            Assessment.processing_status == COMPLETED,
            Assessment.review_status == status,
        )
        .options(
            joinedload(Assessment.work_session).joinedload(WorkSession.user),
            joinedload(Assessment.work_session).joinedload(WorkSession.site),
        )
        .order_by(Assessment.created_at.asc())
    )

    if site_id is not None:
        stmt = stmt.where(WorkSession.site_id == site_id)

    if is_expert(current_user):
        allowed = expert_company_ids(db, current_user)
        if not allowed:
            return []
        stmt = stmt.where(Site.company_id.in_(allowed))
        if company_id is not None:
            assert_expert_can_access_company(db, current_user, company_id)
            stmt = stmt.where(Site.company_id == company_id)
    elif is_company_admin(current_user):
        cid = require_company_id(current_user)
        stmt = stmt.where(Site.company_id == cid)
        if company_id is not None and company_id != cid:
            raise HTTPException(status_code=403, detail="Empresa fuera de tu alcance")
    elif company_id is not None:
        stmt = stmt.where(Site.company_id == company_id)

    rows = db.scalars(stmt).unique().all()
    company_names: dict[int, str] = {}
    out: list[AssessmentReviewQueueItem] = []
    for a in rows:
        ws = a.work_session
        site = ws.site if ws else None
        cid = site.company_id if site else None
        cname: str | None = None
        if cid is not None:
            if cid not in company_names:
                co = db.get(Company, cid)
                company_names[cid] = co.name if co else "—"
            cname = company_names[cid]
        inspector = ws.user.name if ws and ws.user else None
        out.append(
            AssessmentReviewQueueItem(
                id=a.id,
                session_id=a.session_id,
                site_id=site.id if site else None,
                site_name=site.name if site else None,
                company_id=cid,
                company_name=cname,
                inspector_name=inspector,
                ai_calculated_score=a.calculated_score,
                ai_primary_issue=a.primary_issue,
                review_status=a.review_status,
                created_at=a.created_at,
                image_url=image_url(a.image_path),
            )
        )
    return out


@router.patch("/{assessment_id}/expert-review", response_model=AssessmentDetailExpertRead)
def submit_expert_review(
    assessment_id: int,
    body: ExpertReviewUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> AssessmentDetailExpertRead:
    if not is_expert(current_user):
        raise HTTPException(status_code=403, detail="Solo expertos ergonómicos pueden validar informes")

    a = db.scalars(
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(joinedload(Assessment.work_session))
    ).first()
    if a is None:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    if not can_expert_review(db, current_user, a):
        raise HTTPException(status_code=403, detail="No puedes revisar este informe")

    if body.vision_patch:
        from app.schemas.vision import VisionAnalysisResult

        merged = dict(a.raw_ai_json or {})
        merged.update(body.vision_patch)
        try:
            VisionAnalysisResult.model_validate(merged)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Parche de visión inválido: {e}") from e

    try:
        apply_expert_review(
            a,
            action=body.action,
            reviewer_id=current_user.id,
            calculated_score=body.calculated_score,
            primary_issue=body.primary_issue,
            vision_patch=body.vision_patch,
            review_notes=body.review_notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    recalculate_session_metrics(db, a.session_id)
    db.commit()
    db.refresh(a)
    return expert_detail(db, a, viewer=current_user)
