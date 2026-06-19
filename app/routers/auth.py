from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.rate_limit import login_code_limiter
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginCode, Token
from app.schemas.user import UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> User:
    return current_user


@router.post("/login", response_model=Token)
def login(
    db: DbSession,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    user = db.scalars(select(User).where(User.email == form_data.username)).first()
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        str(user.id),
        extra_claims={"role": user.role.value},
    )
    return Token(access_token=token)


@router.post("/login-code", response_model=Token)
def login_code(payload: LoginCode, request: Request, db: DbSession) -> Token:
    client_ip = request.client.host if request.client else "unknown"
    if not login_code_limiter.allow(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
        )
    code = payload.code.strip()
    user = db.scalars(select(User).where(User.access_pin == code)).first() if code else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clave de ingreso incorrecta",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        str(user.id),
        extra_claims={"role": user.role.value},
    )
    return Token(access_token=token)
