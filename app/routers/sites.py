from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from app.core.deps import CurrentUser, DbSession, require_roles
from app.models.company import Company
from app.models.site import Site
from app.models.user import User, UserRole
from app.schemas.site import SiteCreate, SiteRead, SiteUpdate

router = APIRouter()


def _operator_company_id(user: User) -> int:
    if user.role != UserRole.operator:
        raise HTTPException(status_code=403, detail="Solo operadores usan este recurso")
    if user.company_id is None:
        raise HTTPException(
            status_code=400,
            detail="Tu usuario no tiene empresa asignada. Pide a un administrador que te asigne una.",
        )
    return user.company_id


def _get_site_or_404(db, site_id: int) -> Site:
    s = db.get(Site, site_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    return s


@router.get("/mine", response_model=list[SiteRead])
def list_my_sites(db: DbSession, current_user: CurrentUser) -> list[Site]:
    cid = _operator_company_id(current_user)
    stmt = select(Site).where(Site.company_id == cid).order_by(Site.name)
    return db.scalars(stmt).all()


@router.get("", response_model=list[SiteRead])
def list_sites(
    db: DbSession,
    current_user: CurrentUser,
    company_id: int | None = None,
) -> list[Site]:
    if current_user.role == UserRole.super_admin:
        stmt = select(Site)
        if company_id is not None:
            stmt = stmt.where(Site.company_id == company_id)
        stmt = stmt.order_by(Site.company_id, Site.name)
        return db.scalars(stmt).all()
    cid = _operator_company_id(current_user)
    stmt = select(Site).where(Site.company_id == cid).order_by(Site.name)
    return db.scalars(stmt).all()


@router.post("", response_model=SiteRead, status_code=status.HTTP_201_CREATED)
def create_site(
    body: SiteCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> Site:
    if current_user.role == UserRole.super_admin:
        company_id = body.company_id
        if db.get(Company, company_id) is None:
            raise HTTPException(status_code=400, detail="Empresa no válida")
    else:
        cid = _operator_company_id(current_user)
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
    s = _get_site_or_404(db, site_id)
    if current_user.role != UserRole.super_admin:
        cid = _operator_company_id(current_user)
        if s.company_id != cid:
            raise HTTPException(status_code=403, detail="No puedes editar esta sede")
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
    s = _get_site_or_404(db, site_id)
    if current_user.role != UserRole.super_admin:
        cid = _operator_company_id(current_user)
        if s.company_id != cid:
            raise HTTPException(status_code=403, detail="No puedes eliminar esta sede")
    if s.work_sessions:
        raise HTTPException(
            status_code=400,
            detail="Esta sede tiene sesiones de evaluación. No se puede eliminar.",
        )
    db.delete(s)
    db.commit()
