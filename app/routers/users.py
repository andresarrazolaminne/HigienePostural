from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select

from app.core.deps import CurrentUser, DbSession
from app.core.permissions import (
    assert_can_assign_role,
    assert_can_manage_expert_assignments,
    assert_can_manage_user,
    assert_role_company_rules,
    expert_company_ids,
    is_company_admin,
    is_super_admin,
    require_company_id,
    roles_assignable_by,
)
from app.core.permissions import expert_has_assignment
from app.core.tenancy import company_scoped_user_ids_subquery
from app.models.expert_assignment import ExpertCompanyAssignment
from app.models.user import UserRole
from app.schemas.expert_review import ExpertCompanyIdsUpdate
from app.core.security import generate_pin, get_password_hash
from app.models.company import Company
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.schemas.user_update import UserUpdate

router = APIRouter()


def _generate_unique_pin(db: DbSession) -> str:
    for _ in range(50):
        pin = generate_pin(6)
        if not db.scalars(select(User).where(User.access_pin == pin)).first():
            return pin
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="No se pudo generar una clave de ingreso única",
    )


def _user_read(db: DbSession, user: User) -> UserRead:
    ids: list[int] = []
    if user.role == UserRole.expert:
        ids = sorted(expert_company_ids(db, user))
    return UserRead(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        baseline_score=user.baseline_score,
        company_id=user.company_id,
        access_pin=user.access_pin,
        expert_company_ids=ids,
    )


def _require_user_manager(current_user: CurrentUser) -> User:
    if not is_super_admin(current_user) and not is_company_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")
    return current_user


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(_require_user_manager)],
) -> User:
    assert_can_assign_role(current_user, payload.role)
    company_id = payload.company_id
    admin_company_id: int | None = None
    if is_company_admin(current_user):
        admin_company_id = require_company_id(current_user)
        if payload.role == UserRole.super_admin:
            raise HTTPException(status_code=403, detail="No puedes crear super administradores")
        if payload.role == UserRole.expert:
            company_id = None
        else:
            company_id = admin_company_id
    assert_role_company_rules(payload.role, company_id)
    if company_id is not None and db.get(Company, company_id) is None:
        raise HTTPException(status_code=400, detail="Empresa no válida")
    if db.scalars(select(User).where(User.email == str(payload.email))).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    user = User(
        name=payload.name,
        email=str(payload.email),
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        company_id=company_id,
        access_pin=_generate_unique_pin(db),
    )
    db.add(user)
    db.flush()
    if user.role == UserRole.expert and is_company_admin(current_user) and admin_company_id is not None:
        db.add(ExpertCompanyAssignment(user_id=user.id, company_id=admin_company_id))
    db.commit()
    db.refresh(user)
    return _user_read(db, user)


@router.get("", response_model=list[UserRead])
def list_users(
    db: DbSession,
    current_user: Annotated[User, Depends(_require_user_manager)],
) -> list[UserRead]:
    stmt = select(User).order_by(User.id)
    if is_company_admin(current_user):
        cid = require_company_id(current_user)
        visible_ids = company_scoped_user_ids_subquery(cid)
        stmt = stmt.where(User.id.in_(visible_ids))
    return [_user_read(db, u) for u in db.scalars(stmt).all()]


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(_require_user_manager)],
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    assert_can_manage_user(db, current_user, user)
    updates = payload.model_dump(exclude_unset=True)
    if "role" in updates:
        assert_can_assign_role(current_user, updates["role"])
    if "email" in updates:
        new_email = str(updates["email"])
        if new_email != user.email and db.scalars(select(User).where(User.email == new_email)).first():
            raise HTTPException(status_code=400, detail="El email ya está registrado")
        user.email = new_email
    if "name" in updates:
        user.name = updates["name"]
    if "password" in updates:
        user.hashed_password = get_password_hash(updates["password"])
    if "role" in updates:
        user.role = updates["role"]
    if "company_id" in updates:
        cid = updates["company_id"]
        if is_company_admin(current_user):
            cid = require_company_id(current_user)
        if cid is not None and db.get(Company, cid) is None:
            raise HTTPException(status_code=400, detail="Empresa no válida")
        user.company_id = cid
    assert_role_company_rules(user.role, user.company_id)
    db.commit()
    db.refresh(user)
    return _user_read(db, user)


@router.post("/{user_id}/pin", response_model=UserRead)
def regenerate_pin(
    user_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(_require_user_manager)],
) -> UserRead:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    assert_can_manage_user(db, current_user, user)
    user.access_pin = _generate_unique_pin(db)
    db.commit()
    db.refresh(user)
    return _user_read(db, user)


@router.get("/{user_id}/expert-companies", response_model=list[int])
def get_expert_companies(
    user_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(_require_user_manager)],
) -> list[int]:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    assert_can_manage_expert_assignments(db, current_user, user)
    return sorted(expert_company_ids(db, user))


@router.put("/{user_id}/expert-companies", response_model=list[int])
def set_expert_companies(
    user_id: int,
    body: ExpertCompanyIdsUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(_require_user_manager)],
) -> list[int]:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    assert_can_manage_expert_assignments(db, current_user, user)

    if is_super_admin(current_user):
        target_ids = list(dict.fromkeys(body.company_ids))
        for cid in target_ids:
            if db.get(Company, cid) is None:
                raise HTTPException(status_code=400, detail=f"Empresa {cid} no válida")
        db.execute(delete(ExpertCompanyAssignment).where(ExpertCompanyAssignment.user_id == user.id))
        for cid in target_ids:
            db.add(ExpertCompanyAssignment(user_id=user.id, company_id=cid))
    else:
        admin_cid = require_company_id(current_user)
        for cid in body.company_ids:
            if cid != admin_cid:
                raise HTTPException(
                    status_code=403,
                    detail="Solo puedes asignar tu empresa al experto",
                )
        if admin_cid in body.company_ids:
            if not expert_has_assignment(db, user.id, admin_cid):
                db.add(ExpertCompanyAssignment(user_id=user.id, company_id=admin_cid))
        else:
            db.execute(
                delete(ExpertCompanyAssignment).where(
                    ExpertCompanyAssignment.user_id == user.id,
                    ExpertCompanyAssignment.company_id == admin_cid,
                )
            )
    db.commit()
    return sorted(expert_company_ids(db, user))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(_require_user_manager)],
) -> None:
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    assert_can_manage_user(db, current_user, user)
    if is_company_admin(current_user) and user.role not in roles_assignable_by(current_user):
        raise HTTPException(status_code=403, detail="No puedes eliminar este usuario")
    db.delete(user)
    db.commit()
