"""Reglas de acceso por rol (super_admin, company_admin, expert, user)."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.expert_assignment import ExpertCompanyAssignment
from app.models.user import User, UserRole


def is_super_admin(user: User) -> bool:
    return user.role == UserRole.super_admin


def is_company_admin(user: User) -> bool:
    return user.role == UserRole.company_admin


def is_expert(user: User) -> bool:
    return user.role == UserRole.expert


def is_inspector(user: User) -> bool:
    return user.role == UserRole.user


def is_company_member(user: User) -> bool:
    return user.role in (UserRole.user, UserRole.company_admin)


def expert_has_assignment(db: Session, expert_user_id: int, company_id: int) -> bool:
    row = db.scalars(
        select(ExpertCompanyAssignment.id).where(
            ExpertCompanyAssignment.user_id == expert_user_id,
            ExpertCompanyAssignment.company_id == company_id,
        )
    ).first()
    return row is not None


def assert_expert_managed_by_company_admin(db: Session, actor: User, expert: User) -> None:
    if not is_company_admin(actor):
        return
    cid = require_company_id(actor)
    if not expert_has_assignment(db, expert.id, cid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este experto no está asignado a tu empresa",
        )


def expert_company_ids(db: Session, user: User) -> set[int]:
    if not is_expert(user):
        return set()
    rows = db.scalars(
        select(ExpertCompanyAssignment.company_id).where(ExpertCompanyAssignment.user_id == user.id)
    ).all()
    return set(rows)


def assert_expert_can_access_company(db: Session, user: User, company_id: int) -> None:
    if is_super_admin(user):
        return
    if not is_expert(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    if company_id not in expert_company_ids(db, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes asignación a esta empresa",
        )


def require_company_id(user: User) -> int:
    if user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tu cuenta no tiene empresa asignada. Contacta al administrador.",
        )
    return user.company_id


def assert_role_company_rules(role: UserRole, company_id: int | None) -> None:
    if role == UserRole.super_admin and company_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El super administrador no debe tener empresa asignada",
        )
    if role == UserRole.expert and company_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El experto ergonómico no debe tener empresa fija; usa asignaciones multi-empresa",
        )
    if role in (UserRole.company_admin, UserRole.user) and company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administradores de empresa e inspectores requieren una empresa asignada",
        )


def roles_assignable_by(actor: User) -> set[UserRole]:
    if is_super_admin(actor):
        return {UserRole.super_admin, UserRole.company_admin, UserRole.expert, UserRole.user}
    if is_company_admin(actor):
        return {UserRole.company_admin, UserRole.expert, UserRole.user}
    return set()


def assert_can_manage_user(db: Session, actor: User, target: User) -> None:
    if is_super_admin(actor):
        return
    if not is_company_admin(actor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")
    if target.role == UserRole.super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes gestionar super administradores")
    if target.role == UserRole.expert:
        assert_expert_managed_by_company_admin(db, actor, target)
        return
    if target.company_id != actor.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario fuera de tu empresa")


def assert_can_assign_role(actor: User, role: UserRole) -> None:
    if role not in roles_assignable_by(actor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes asignar ese rol",
        )


def assert_can_manage_expert_assignments(db: Session, actor: User, target: User) -> None:
    if not is_super_admin(actor) and not is_company_admin(actor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")
    if target.role != UserRole.expert:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario no es experto ergonómico")
    assert_can_manage_user(db, actor, target)
