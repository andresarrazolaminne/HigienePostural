from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.core.permissions import (
    assert_expert_can_access_company,
    expert_company_ids,
    is_company_admin,
    is_expert,
    is_super_admin,
    require_company_id,
)
from app.models.site import Site
from app.schemas.site_report import SiteReportRead
from app.services.site_report_service import SiteReportService

router = APIRouter()


def _assert_can_view_site(db: DbSession, user, site_id: int) -> Site:
    site = db.get(Site, site_id)
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sede no encontrada")
    if is_super_admin(user):
        return site
    if is_company_admin(user):
        cid = require_company_id(user)
        if site.company_id != cid:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta sede")
        return site
    if is_expert(user):
        assert_expert_can_access_company(db, user, site.company_id)
        return site
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")


@router.get("/sites/{site_id}", response_model=SiteReportRead)
def get_site_report(
    site_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> SiteReportRead:
    _assert_can_view_site(db, current_user, site_id)
    try:
        return SiteReportService().build_report(db, site_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
