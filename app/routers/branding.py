from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse, Response
from pathlib import Path

from app.core.deps import DbSession, require_roles
from app.core.upload_validation import image_media_type
from app.models.user import User, UserRole
from app.schemas.branding import BrandingRead, BrandingUpdate
from app.services.branding_service import branding_to_read, get_or_create_branding
from app.services.storage_service import StorageError, get_storage_service

router = APIRouter()

MAX_LOGO_BYTES = 2 * 1024 * 1024


@router.get("", response_model=BrandingRead)
def get_branding(db: DbSession) -> BrandingRead:
    row = get_or_create_branding(db)
    return branding_to_read(row)


@router.patch("", response_model=BrandingRead)
def update_branding(
    body: BrandingUpdate,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> BrandingRead:
    row = get_or_create_branding(db)
    if body.app_name is not None:
        row.app_name = body.app_name.strip() or None
    if body.app_tagline is not None:
        row.app_tagline = body.app_tagline.strip() or None
    db.commit()
    db.refresh(row)
    return branding_to_read(row)


@router.post("/logo", response_model=BrandingRead)
async def upload_logo(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.super_admin))],
    file: UploadFile = File(...),
) -> BrandingRead:
    raw = await file.read()
    if len(raw) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=400, detail="El logo no puede superar 2 MB")
    media = image_media_type(raw)
    if media is None:
        raise HTTPException(status_code=400, detail="Solo se admiten imágenes PNG o JPEG")
    ext = ".png" if media == "image/png" else ".jpg"
    storage = get_storage_service()
    try:
        logo_path = storage.save_branding_logo(raw=raw, ext=ext, content_type=media)
    except StorageError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    row = get_or_create_branding(db)
    row.logo_path = logo_path
    db.commit()
    db.refresh(row)
    return branding_to_read(row)


@router.delete("/logo", response_model=BrandingRead)
def delete_logo(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.super_admin))],
) -> BrandingRead:
    row = get_or_create_branding(db)
    if row.logo_path:
        get_storage_service().delete_image(row.logo_path)
        row.logo_path = None
        db.commit()
        db.refresh(row)
    return branding_to_read(row)


@router.get("/logo")
def get_logo(db: DbSession) -> Response:
    row = get_or_create_branding(db)
    if not row.logo_path:
        raise HTTPException(status_code=404, detail="Logo no configurado")
    storage = get_storage_service()
    public = storage.public_url(row.logo_path)
    if public:
        return RedirectResponse(public, status_code=302)
    path = Path(row.logo_path)
    if not path.is_file():
        candidate = Path.cwd() / row.logo_path
        path = candidate if candidate.is_file() else path
    if not path.is_file():
        try:
            body, media = storage.read_branding_logo(row.logo_path)
            return Response(content=body, media_type=media, headers={"Cache-Control": "public, max-age=300"})
        except StorageError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
    suffix = path.suffix.lower()
    media = "image/png" if suffix == ".png" else "image/jpeg"
    return FileResponse(path, media_type=media, headers={"Cache-Control": "public, max-age=300"})
