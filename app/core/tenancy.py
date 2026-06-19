"""Aislamiento de datos por empresa (multi-tenant)."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import expert_company_ids, require_company_id
from app.models.user import UserRole
from app.models.expert_assignment import ExpertCompanyAssignment
from app.models.site import Site
from app.models.user import User, UserRole


def assert_site_belongs_to_company(site: Site, company_id: int) -> None:
    if site.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La sede no pertenece a tu empresa",
        )


def get_site_or_404(db: Session, site_id: int) -> Site:
    site = db.get(Site, site_id)
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sede no encontrada")
    return site


def assert_site_visible(db: Session, user: User, site_id: int) -> Site:
    """Comprueba que el usuario puede ver/usar la sede."""
    site = get_site_or_404(db, site_id)
    if user.role == UserRole.super_admin:
        return site
    if user.role in (UserRole.company_admin, UserRole.user):
        assert_site_belongs_to_company(site, require_company_id(user))
        return site
    if user.role == UserRole.expert:
        if site.company_id not in expert_company_ids(db, user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes asignación a la empresa de esta sede",
            )
        return site
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")


def company_scoped_user_ids_subquery(company_id: int):
    """IDs de usuarios visibles para un admin de empresa: miembros + expertos asignados."""
    expert_ids = select(ExpertCompanyAssignment.user_id).where(
        ExpertCompanyAssignment.company_id == company_id
    )
    return select(User.id).where(
        (User.company_id == company_id) | (User.id.in_(expert_ids))
    )
