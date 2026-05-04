from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession, require_roles
from app.core.security import get_password_hash
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserRead
from app.schemas.user_update import UserUpdate

router = APIRouter()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> User:
    if db.scalars(select(User).where(User.email == str(payload.email))).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    if payload.company_id is not None and db.get(Company, payload.company_id) is None:
        raise HTTPException(status_code=400, detail="Empresa no válida")
    user = User(
        name=payload.name,
        email=str(payload.email),
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        company_id=payload.company_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserRead])
def list_users(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> list[User]:
    return db.scalars(select(User).order_by(User.id)).all()


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    updates = payload.model_dump(exclude_unset=True)
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
        if cid is not None and db.get(Company, cid) is None:
            raise HTTPException(status_code=400, detail="Empresa no válida")
        user.company_id = cid
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> None:
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(user)
    db.commit()
