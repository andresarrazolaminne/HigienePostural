import logging
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.models.assessment import Assessment
from app.models.user import UserRole
from app.models.work_session import WorkSession
from app.schemas.assessment import AssessmentDetailRead, AssessmentListItem, AssessmentUploadResponse
from app.services.analytical_agent_service import AnalyticalAgentService, PersistContext
from app.services.vision_agent_service import VisionAgentService

router = APIRouter()
logger = logging.getLogger(__name__)

_MAX_BYTES = 10 * 1024 * 1024
_ALLOWED_TYPES = frozenset({"image/jpeg", "image/png"})


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


@router.get("/mine", response_model=list[AssessmentListItem])
def list_my_assessments(db: DbSession, current_user: CurrentUser) -> list[AssessmentListItem]:
    if current_user.role != UserRole.operator:
        raise HTTPException(status_code=403, detail="Solo operadores tienen informes personales aquí")
    stmt = (
        select(Assessment)
        .join(WorkSession, Assessment.session_id == WorkSession.id)
        .where(WorkSession.user_id == current_user.id)
        .options(joinedload(Assessment.work_session))
        .order_by(Assessment.created_at.desc())
    )
    rows = db.scalars(stmt).unique().all()
    return [
        AssessmentListItem(
            id=a.id,
            session_id=a.session_id,
            site_id=a.work_session.site_id if a.work_session else None,
            calculated_score=a.calculated_score,
            primary_issue=a.primary_issue,
            created_at=a.created_at,
        )
        for a in rows
    ]


@router.get("/{assessment_id}/image")
def get_assessment_image(assessment_id: int, db: DbSession, current_user: CurrentUser) -> FileResponse:
    a = db.scalars(
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(joinedload(Assessment.work_session))
    ).first()
    if a is None:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    if current_user.role != UserRole.super_admin and (
        a.work_session is None or a.work_session.user_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="No tienes acceso a este informe")
    path = _resolved_image_path(a.image_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Archivo de imagen no encontrado")
    suffix = path.suffix.lower()
    media = "image/png" if suffix == ".png" else "image/jpeg"
    return FileResponse(path, media_type=media)


@router.get("/{assessment_id}", response_model=AssessmentDetailRead)
def get_assessment(assessment_id: int, db: DbSession, current_user: CurrentUser) -> AssessmentDetailRead:
    a = db.scalars(
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(joinedload(Assessment.work_session))
    ).first()
    if a is None:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    if current_user.role != UserRole.super_admin and (
        a.work_session is None or a.work_session.user_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="No tienes acceso a este informe")
    return AssessmentDetailRead(
        id=a.id,
        session_id=a.session_id,
        site_id=a.work_session.site_id if a.work_session else None,
        calculated_score=a.calculated_score,
        primary_issue=a.primary_issue,
        created_at=a.created_at,
        raw_ai_json=a.raw_ai_json,
        image_path=a.image_path,
    )


@router.post("/upload", response_model=AssessmentUploadResponse)
def upload_assessment(
    db: DbSession,
    current_user: CurrentUser,
    session_id: Annotated[int, Form(..., description="ID de sesión existente")],
    file: Annotated[UploadFile, File(..., description="Imagen JPEG o PNG del puesto")],
) -> AssessmentUploadResponse:
    if current_user.role != UserRole.operator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los operadores pueden subir evaluaciones",
        )

    ws = db.get(WorkSession, session_id)
    if ws is None or ws.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o no pertenece al usuario")

    if not file.content_type or file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPEG o PNG")

    raw = file.file.read(_MAX_BYTES + 1)
    if len(raw) > _MAX_BYTES:
        raise HTTPException(status_code=400, detail="El archivo supera el tamaño máximo permitido")

    settings = get_settings()
    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png"}:
        ext = ".jpg" if file.content_type == "image/jpeg" else ".png"

    dest_dir = Path(settings.upload_dir) / str(current_user.id) / str(session_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{uuid.uuid4().hex}{ext}"
    dest_path = dest_dir / fname
    dest_path.write_bytes(raw)
    rel_path = str(dest_path.as_posix())

    vision_svc = VisionAgentService()
    analytical = AnalyticalAgentService()
    try:
        vision = vision_svc.analyze_image(raw, file.content_type)
        return analytical.process_and_persist(
            db,
            PersistContext(
                user_id=current_user.id,
                session_id=session_id,
                image_path=rel_path,
                vision=vision,
            ),
        )
    except RuntimeError as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    except ValueError as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except AuthenticationError as e:
        dest_path.unlink(missing_ok=True)
        logger.warning("OpenAI auth failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clave de OpenAI inválida o rechazada. Revisa OPENAI_API_KEY en el servidor.",
        ) from e
    except RateLimitError as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=429,
            detail="Límite de uso de la API de OpenAI. Espera un momento e inténtalo de nuevo.",
        ) from e
    except (APIConnectionError, APITimeoutError) as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo conectar con OpenAI: {e}",
        ) from e
    except BadRequestError as e:
        dest_path.unlink(missing_ok=True)
        logger.warning("OpenAI bad request: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Solicitud rechazada por OpenAI: {e}",
        ) from e
    except APIStatusError as e:
        dest_path.unlink(missing_ok=True)
        logger.warning("OpenAI API status error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error de OpenAI ({getattr(e, 'status_code', '?')}): {e}",
        ) from e
    except Exception as e:
        dest_path.unlink(missing_ok=True)
        logger.exception("Fallo en pipeline de evaluación (IA o persistencia)")
        detail = str(e).strip() or repr(e)
        if len(detail) > 600:
            detail = detail[:597] + "…"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al procesar la imagen: {detail}",
        ) from e
