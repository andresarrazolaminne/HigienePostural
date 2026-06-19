from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import CurrentUser, DbSession, require_roles
from app.core.permissions import expert_company_ids, is_company_admin, is_expert, is_inspector, is_super_admin, require_company_id
from app.core.tenancy import assert_site_visible
from app.models.site import Site
from app.models.user import User, UserRole
from app.models.work_session import WorkSession
from app.routers.session_cleanup import unlink_assessment_image, unlink_session_upload_dir
from app.routers.session_helpers import work_session_to_read
from app.schemas.session import WorkSessionCreate, WorkSessionEnd, WorkSessionRead

router = APIRouter()


def _can_access_session(db: Session, user: User, ws: WorkSession) -> bool:
    if is_super_admin(user):
        return True
    if is_inspector(user) and ws.user_id == user.id:
        return True
    if ws.site_id is None:
        return False
    site = db.get(Site, ws.site_id)
    if site is None:
        return False
    if is_company_admin(user):
        return site.company_id == user.company_id
    if is_expert(user):
        return site.company_id in expert_company_ids(db, user)
    return False


def _get_accessible_session(db: Session, session_id: int, user: User) -> WorkSession:
    ws = db.get(WorkSession, session_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if not _can_access_session(db, user, ws):
        raise HTTPException(status_code=403, detail="No puedes acceder a esta sesión")
    return ws


@router.post("", response_model=WorkSessionRead, status_code=status.HTTP_201_CREATED)
def create_session(
    body: WorkSessionCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> WorkSessionRead:
    if not is_inspector(current_user):
        raise HTTPException(
            status_code=400,
            detail="Solo los inspectores pueden iniciar sesiones de evaluación",
        )
    assert_site_visible(db, current_user, body.site_id)

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
    if not is_inspector(current_user):
        raise HTTPException(status_code=403, detail="Solo inspectores tienen sesiones personales")
    stmt = select(WorkSession).where(WorkSession.user_id == current_user.id)
    if site_id is not None:
        assert_site_visible(db, current_user, site_id)
        stmt = stmt.where(WorkSession.site_id == site_id)
    stmt = stmt.order_by(WorkSession.id.desc())
    rows = db.scalars(stmt).all()
    return [work_session_to_read(db, ws) for ws in rows]


@router.get("/company", response_model=list[WorkSessionRead])
def list_company_sessions(
    db: DbSession,
    current_user: CurrentUser,
    site_id: int | None = None,
) -> list[WorkSessionRead]:
    if not is_company_admin(current_user) and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    if is_super_admin(current_user):
        stmt = select(WorkSession)
        if site_id is not None:
            stmt = stmt.where(WorkSession.site_id == site_id)
        stmt = stmt.order_by(WorkSession.id.desc())
    else:
        cid = require_company_id(current_user)
        stmt = (
            select(WorkSession)
            .join(Site, WorkSession.site_id == Site.id)
            .where(Site.company_id == cid)
        )
        if site_id is not None:
            assert_site_visible(db, current_user, site_id)
            stmt = stmt.where(WorkSession.site_id == site_id)
        stmt = stmt.order_by(WorkSession.id.desc())
    rows = db.scalars(stmt).unique().all()
    return [work_session_to_read(db, ws) for ws in rows]


def _can_delete_session(db: Session, user: User, ws: WorkSession) -> bool:
    return _can_access_session(db, user, ws) and (
        is_super_admin(user)
        or (is_inspector(user) and ws.user_id == user.id)
        or is_company_admin(user)
    )


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
    ws = _get_accessible_session(db, session_id, current_user)
    return work_session_to_read(db, ws)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, db: DbSession, current_user: CurrentUser) -> None:
    ws = db.scalars(
        select(WorkSession)
        .where(WorkSession.id == session_id)
        .options(selectinload(WorkSession.assessments))
    ).first()
    if ws is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if not _can_delete_session(db, current_user, ws):
        raise HTTPException(status_code=403, detail="No puedes eliminar esta sesión")
    for assessment in ws.assessments:
        unlink_assessment_image(assessment.image_path)
    user_id, sid = ws.user_id, ws.id
    db.delete(ws)
    db.commit()
    unlink_session_upload_dir(user_id, sid)


@router.patch("/{session_id}/end", response_model=WorkSessionRead)
def end_session(
    session_id: int,
    body: WorkSessionEnd,
    db: DbSession,
    current_user: CurrentUser,
) -> WorkSessionRead:
    ws = _get_accessible_session(db, session_id, current_user)
    if not is_inspector(current_user):
        raise HTTPException(status_code=403, detail="Solo el inspector puede cerrar su sesión")
    if ws.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes cerrar tus propias sesiones")
    ws.end_time = body.end_time or datetime.now(timezone.utc)
    db.commit()
    db.refresh(ws)
    return work_session_to_read(db, ws)
