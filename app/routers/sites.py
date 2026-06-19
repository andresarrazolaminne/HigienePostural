from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession, require_roles
from app.core.permissions import expert_company_ids, is_company_admin, is_expert, is_inspector, is_super_admin, require_company_id
from app.core.tenancy import assert_site_belongs_to_company, assert_site_visible, get_site_or_404
from app.models.company import Company
from app.models.site import Site
from app.models.user import User, UserRole
from app.schemas.site import SiteCreate, SiteRead, SiteUpdate

router = APIRouter()


def _sites_for_user(db: DbSession, user: User, *, filter_company_id: int | None = None) -> list[Site]:
    if is_super_admin(user):
        stmt = select(Site)
        if filter_company_id is not None:
            stmt = stmt.where(Site.company_id == filter_company_id)
        return db.scalars(stmt.order_by(Site.company_id, Site.name)).all()
    if is_expert(user):
        allowed = expert_company_ids(db, user)
        if not allowed:
            return []
        stmt = select(Site).where(Site.company_id.in_(allowed))
        if filter_company_id is not None:
            if filter_company_id not in allowed:
                raise HTTPException(status_code=403, detail="Empresa fuera de tu alcance")
            stmt = stmt.where(Site.company_id == filter_company_id)
        return db.scalars(stmt.order_by(Site.name)).all()
    cid = require_company_id(user)
    if filter_company_id is not None and filter_company_id != cid:
        raise HTTPException(status_code=403, detail="Empresa fuera de tu alcance")
    return db.scalars(select(Site).where(Site.company_id == cid).order_by(Site.name)).all()


def _require_site_manager(user: User) -> None:
    if is_inspector(user) or is_expert(user):
        raise HTTPException(status_code=403, detail="No tienes permiso para gestionar sedes")


@router.get("/mine", response_model=list[SiteRead])
def list_my_sites(db: DbSession, current_user: CurrentUser) -> list[Site]:
    if is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Los super administradores usan el listado global de sedes")
    return _sites_for_user(db, current_user)


@router.get("", response_model=list[SiteRead])
def list_sites(
    db: DbSession,
    current_user: CurrentUser,
    company_id: int | None = None,
) -> list[Site]:
    return _sites_for_user(db, current_user, filter_company_id=company_id)


@router.post("", response_model=SiteRead, status_code=status.HTTP_201_CREATED)
def create_site(
    body: SiteCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> Site:
    _require_site_manager(current_user)
    if is_super_admin(current_user):
        company_id = body.company_id
        if db.get(Company, company_id) is None:
            raise HTTPException(status_code=400, detail="Empresa no válida")
    else:
        cid = require_company_id(current_user)
        if body.company_id != cid:
            raise HTTPException(status_code=403, detail="Solo puedes crear sedes en tu empresa")
        company_id = cid

    s = Site(company_id=company_id, name=body.name.strip(), address=body.address.strip() if body.address else None)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/{site_id}", response_model=SiteRead)
def update_site(
    site_id: int,
    body: SiteUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> Site:
    _require_site_manager(current_user)
    s = get_site_or_404(db, site_id)
    if not is_super_admin(current_user):
        assert_site_belongs_to_company(s, require_company_id(current_user))
    if body.name is not None:
        s.name = body.name.strip()
    if body.address is not None:
        s.address = body.address.strip() or None
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(
    site_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    _require_site_manager(current_user)
    s = get_site_or_404(db, site_id)
    if not is_super_admin(current_user):
        assert_site_belongs_to_company(s, require_company_id(current_user))
    if s.work_sessions:
        raise HTTPException(
            status_code=400,
            detail="Esta sede tiene sesiones de evaluación. No se puede eliminar.",
        )
    db.delete(s)
    db.commit()
