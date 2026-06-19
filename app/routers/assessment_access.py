"""Permisos de acceso a informes por rol."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import (
    expert_company_ids,
    is_company_admin,
    is_expert,
    is_inspector,
    is_super_admin,
    require_company_id,
)
from app.models.assessment import Assessment
from app.models.site import Site
from app.models.user import User


def company_id_for_assessment(db: Session, assessment: Assessment) -> int | None:
    ws = assessment.work_session
    if ws is None or ws.site_id is None:
        return None
    site = db.get(Site, ws.site_id)
    return site.company_id if site else None


def can_view_assessment(db: Session, user: User, assessment: Assessment) -> bool:
    if is_super_admin(user):
        return True
    ws = assessment.work_session
    if ws is None:
        return False
    if is_inspector(user):
        return ws.user_id == user.id
    cid = company_id_for_assessment(db, assessment)
    if cid is None:
        return False
    if is_company_admin(user):
        return user.company_id == cid
    if is_expert(user):
        return cid in expert_company_ids(db, user)
    return False


def can_expert_review(db: Session, user: User, assessment: Assessment) -> bool:
    if not is_expert(user):
        return False
    if assessment.processing_status != "completed":
        return False
    return can_view_assessment(db, user, assessment)
