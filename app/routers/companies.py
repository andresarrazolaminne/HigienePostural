from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.core.deps import DbSession, require_roles
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.company import CompanyCreate, CompanyRead, CompanyUpdate

router = APIRouter()


@router.get("", response_model=list[CompanyRead])
def list_companies(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> list[Company]:
    return db.scalars(select(Company).order_by(Company.name)).all()


@router.post("", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company(
    body: CompanyCreate,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> Company:
    c = Company(name=body.name.strip())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.patch("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: int,
    body: CompanyUpdate,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> Company:
    c = db.get(Company, company_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    if body.name is not None:
        c.name = body.name.strip()
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> None:
    c = db.get(Company, company_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    if c.sites:
        raise HTTPException(
            status_code=400,
            detail="Elimina o reasigna las sedes de esta empresa antes de borrarla",
        )
    db.delete(c)
    db.commit()
