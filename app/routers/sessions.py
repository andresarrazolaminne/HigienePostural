from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, DbSession, require_roles
from app.models.user import User, UserRole
from app.models.work_session import WorkSession
from app.models.site import Site
from app.routers.session_helpers import work_session_to_read
from app.schemas.session import WorkSessionCreate, WorkSessionEnd, WorkSessionRead

router = APIRouter()


def _get_owned_session(db: Session, session_id: int, user: User) -> WorkSession:
    ws = db.get(WorkSession, session_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if user.role != UserRole.super_admin and ws.user_id != user.id:
        raise HTTPException(status_code=403, detail="No puedes acceder a esta sesión")
    return ws


@router.post("", response_model=WorkSessionRead, status_code=status.HTTP_201_CREATED)
def create_session(
    body: WorkSessionCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> WorkSessionRead:
    if current_user.role == UserRole.super_admin:
        raise HTTPException(
            status_code=400,
            detail="Los super administradores no crean sesiones de evaluación desde esta cuenta",
        )
    if current_user.company_id is None:
        raise HTTPException(
            status_code=400,
            detail="Tu usuario no tiene empresa asignada; no puedes crear sesiones en una sede.",
        )
    site = db.get(Site, body.site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    if site.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="La sede no pertenece a tu empresa")

    ws = WorkSession(
        user_id=current_user.id,
        site_id=body.site_id,
        start_time=datetime.now(timezone.utc),
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return work_session_to_read(db, ws)


@router.get("/mine", response_model=list[WorkSessionRead])
def list_my_sessions(
    db: DbSession,
    current_user: CurrentUser,
    site_id: int | None = None,
) -> list[WorkSessionRead]:
    if current_user.role == UserRole.super_admin:
        return []
    stmt = select(WorkSession).where(WorkSession.user_id == current_user.id)
    if site_id is not None:
        stmt = stmt.where(WorkSession.site_id == site_id)
    stmt = stmt.order_by(WorkSession.id.desc())
    rows = db.scalars(stmt).all()
    return [work_session_to_read(db, ws) for ws in rows]


@router.get("/all", response_model=list[WorkSessionRead])
def list_all_sessions(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> list[WorkSessionRead]:
    stmt = select(WorkSession).order_by(WorkSession.id.desc())
    rows = db.scalars(stmt).all()
    return [work_session_to_read(db, ws) for ws in rows]


@router.get("/{session_id}", response_model=WorkSessionRead)
def get_session(session_id: int, db: DbSession, current_user: CurrentUser) -> WorkSessionRead:
    ws = _get_owned_session(db, session_id, current_user)
    return work_session_to_read(db, ws)


@router.patch("/{session_id}/end", response_model=WorkSessionRead)
def end_session(
    session_id: int,
    body: WorkSessionEnd,
    db: DbSession,
    current_user: CurrentUser,
) -> WorkSessionRead:
    ws = _get_owned_session(db, session_id, current_user)
    if current_user.role == UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Solo el operador puede cerrar su sesión")
    ws.end_time = body.end_time or datetime.now(timezone.utc)
    db.commit()
    db.refresh(ws)
    return work_session_to_read(db, ws)
