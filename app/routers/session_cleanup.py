"""Limpieza de archivos al borrar sesiones o evaluaciones."""

from pathlib import Path

from app.core.config import get_settings
from app.services.storage_service import get_storage_service


def resolve_upload_path(image_path_str: str) -> Path | None:
    settings = get_settings()
    root = Path(settings.upload_dir).resolve()
    raw = Path(image_path_str)
    candidate = raw.resolve() if raw.is_absolute() else (Path.cwd() / raw).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    return candidate


def unlink_assessment_image(image_path_str: str) -> None:
    get_storage_service().delete_image(image_path_str)


def unlink_session_upload_dir(user_id: int, session_id: int) -> None:
    settings = get_settings()
    if settings.storage_backend == "s3":
        return
    root = Path(settings.upload_dir).resolve()
    session_dir = (root / str(user_id) / str(session_id)).resolve()
    try:
        session_dir.relative_to(root)
    except ValueError:
        return
    if session_dir.is_dir():
        for f in session_dir.iterdir():
            if f.is_file():
                f.unlink(missing_ok=True)
        try:
            session_dir.rmdir()
        except OSError:
            pass
