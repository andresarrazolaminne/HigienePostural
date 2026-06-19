import logging
from pathlib import Path

from typing import Annotated



from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from fastapi.responses import FileResponse, RedirectResponse

from sqlalchemy import select

from sqlalchemy.orm import joinedload



from app.core.config import get_settings
from app.core.processing_status import COMPLETED, QUEUED

from app.core.deps import CurrentUser, DbSession

from app.core.permissions import is_company_admin, is_expert, is_inspector, is_super_admin, require_company_id
from app.routers.assessment_access import can_view_assessment
from app.services.assessment_reads import detail_for_user, list_item_for_user
from app.routers import assessment_expert

from app.core.image_normalize import normalize_upload_image

from app.models.assessment import Assessment

from app.models.site import Site

from datetime import datetime, timezone



from app.models.user import User

from app.models.work_session import WorkSession

from app.schemas.assessment import (

    AssessmentDetailRead,

    AssessmentListItem,

    AssessmentNotesUpdate,

    AssessmentUploadQueuedResponse,

    AssessmentUploadResponse,

)

from app.services.assessment_queue import enqueue_assessment, queue_depth

from app.services.storage_service import StorageError, get_storage_service



router = APIRouter()
router.include_router(assessment_expert.router)

logger = logging.getLogger(__name__)



_MAX_BYTES = 10 * 1024 * 1024




def _resolved_image_path(image_path_str: str) -> Path:

    settings = get_settings()

    root = Path(settings.upload_dir).resolve()

    raw = Path(image_path_str)

    candidate = raw.resolve() if raw.is_absolute() else (Path.cwd() / raw).resolve()

    try:

        candidate.relative_to(root)

    except ValueError as e:

        raise HTTPException(status_code=404, detail="Imagen no disponible") from e

    return candidate





def _image_url(image_path: str) -> str | None:

    return get_storage_service().public_url(image_path)





def _can_edit_assessment_notes(db: DbSession, user: User, assessment: Assessment) -> bool:
    if is_expert(user):
        return False
    return can_view_assessment(db, user, assessment)





@router.get("/mine", response_model=list[AssessmentListItem])

def list_my_assessments(db: DbSession, current_user: CurrentUser) -> list[AssessmentListItem]:

    if not is_inspector(current_user):

        raise HTTPException(status_code=403, detail="Solo inspectores tienen informes personales aquí")

    stmt = (

        select(Assessment)

        .join(WorkSession, Assessment.session_id == WorkSession.id)

        .where(WorkSession.user_id == current_user.id)

        .options(joinedload(Assessment.work_session))

        .order_by(Assessment.created_at.desc())

    )

    rows = db.scalars(stmt).unique().all()

    return [list_item_for_user(a, viewer=current_user) for a in rows]





@router.get("/company", response_model=list[AssessmentListItem])

def list_company_assessments(db: DbSession, current_user: CurrentUser) -> list[AssessmentListItem]:

    if not is_company_admin(current_user) and not is_super_admin(current_user) and not is_expert(current_user):
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    stmt = (

        select(Assessment)

        .join(WorkSession, Assessment.session_id == WorkSession.id)

        .options(joinedload(Assessment.work_session))

        .order_by(Assessment.created_at.desc())

    )

    if is_company_admin(current_user):
        cid = require_company_id(current_user)
        stmt = stmt.join(Site, WorkSession.site_id == Site.id).where(Site.company_id == cid)
    elif is_expert(current_user):
        from app.core.permissions import expert_company_ids

        allowed = expert_company_ids(db, current_user)
        if not allowed:
            return []
        stmt = stmt.join(Site, WorkSession.site_id == Site.id).where(Site.company_id.in_(allowed))

    rows = db.scalars(stmt).unique().all()
    return [list_item_for_user(a, viewer=current_user) for a in rows]





@router.get("/{assessment_id}/image")

def get_assessment_image(assessment_id: int, db: DbSession, current_user: CurrentUser):

    a = db.scalars(

        select(Assessment)

        .where(Assessment.id == assessment_id)

        .options(joinedload(Assessment.work_session))

    ).first()

    if a is None:

        raise HTTPException(status_code=404, detail="Informe no encontrado")

    if not can_view_assessment(db, current_user, a):
        raise HTTPException(status_code=403, detail="No tienes acceso a este informe")

    storage = get_storage_service()

    public = storage.public_url(a.image_path)

    if public:

        return RedirectResponse(public, status_code=302)



    path = _resolved_image_path(a.image_path)

    if not path.is_file():

        raise HTTPException(status_code=404, detail="Archivo de imagen no encontrado")

    suffix = path.suffix.lower()

    media = "image/png" if suffix == ".png" else "image/jpeg"

    return FileResponse(path, media_type=media)





@router.get("/{assessment_id}")

def get_assessment(assessment_id: int, db: DbSession, current_user: CurrentUser):

    a = db.scalars(

        select(Assessment)

        .where(Assessment.id == assessment_id)

        .options(joinedload(Assessment.work_session))

    ).first()

    if a is None:

        raise HTTPException(status_code=404, detail="Informe no encontrado")

    if not can_view_assessment(db, current_user, a):
        raise HTTPException(status_code=403, detail="No tienes acceso a este informe")

    return detail_for_user(db, a, viewer=current_user)





@router.patch("/{assessment_id}/notes", response_model=AssessmentDetailRead)

def update_assessment_notes(

    assessment_id: int,

    body: AssessmentNotesUpdate,

    db: DbSession,

    current_user: CurrentUser,

) -> AssessmentDetailRead:

    a = db.scalars(

        select(Assessment)

        .where(Assessment.id == assessment_id)

        .options(joinedload(Assessment.work_session))

    ).first()

    if a is None:

        raise HTTPException(status_code=404, detail="Informe no encontrado")

    if not _can_edit_assessment_notes(db, current_user, a):
        raise HTTPException(status_code=403, detail="No puedes editar las notas de este informe")

    text = body.professional_notes.strip() if body.professional_notes else None

    if text == "":

        text = None

    a.professional_notes = text

    if text is None:

        a.notes_updated_at = None

        a.notes_author_id = None

    else:

        a.notes_updated_at = datetime.now(timezone.utc)

        a.notes_author_id = current_user.id

    db.commit()

    db.refresh(a)

    return detail_for_user(db, a, viewer=current_user)





@router.post("/upload", response_model=AssessmentUploadQueuedResponse)

def upload_assessment(

    db: DbSession,

    current_user: CurrentUser,

    session_id: Annotated[int, Form(..., description="ID de sesión existente")],

    file: Annotated[UploadFile, File(..., description="Imagen JPEG o PNG del puesto")],

) -> AssessmentUploadQueuedResponse:

    if not is_inspector(current_user):

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN,

            detail="Solo los inspectores pueden subir evaluaciones",

        )



    ws = db.get(WorkSession, session_id)

    if ws is None or ws.user_id != current_user.id:

        raise HTTPException(status_code=404, detail="Sesión no encontrada o no pertenece al usuario")

    if ws.end_time is not None:

        raise HTTPException(status_code=400, detail="La sesión está cerrada; abre una sesión activa")



    raw = file.file.read(_MAX_BYTES + 1)

    if len(raw) > _MAX_BYTES:

        raise HTTPException(status_code=400, detail="El archivo supera el tamaño máximo permitido")



    try:

        raw, content_type = normalize_upload_image(raw)

    except ValueError as e:

        raise HTTPException(status_code=400, detail=str(e)) from e



    storage = get_storage_service()

    try:

        stored_path = storage.save_assessment_image(

            user_id=current_user.id,

            session_id=session_id,

            raw=raw,

            ext=".jpg",

            content_type=content_type,

        )

    except StorageError as e:

        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e



    assessment = Assessment(
        session_id=session_id,
        image_path=stored_path,
        processing_status=QUEUED,
        raw_ai_json=None,
        calculated_score=None,
        primary_issue=None,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    depth = queue_depth()
    enqueue_assessment(assessment.id)

    return AssessmentUploadQueuedResponse(
        assessment_id=assessment.id,
        session_id=session_id,
        processing_status=QUEUED,
        image_url=_image_url(stored_path),
        queue_position=depth + 1,
    )


