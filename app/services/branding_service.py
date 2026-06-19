from sqlalchemy.orm import Session

from app.models.platform_branding import PlatformBranding
from app.schemas.branding import BrandingRead
from app.services.storage_service import get_storage_service

DEFAULT_APP_NAME = "Husky"
DEFAULT_APP_TAGLINE = "Misión de campo"


def get_or_create_branding(db: Session) -> PlatformBranding:
    row = db.get(PlatformBranding, 1)
    if row is None:
        row = PlatformBranding(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def branding_to_read(row: PlatformBranding) -> BrandingRead:
    storage = get_storage_service()
    logo_url: str | None = None
    if row.logo_path:
        logo_url = storage.public_url(row.logo_path) or "/branding/logo"
    return BrandingRead(
        app_name=(row.app_name or DEFAULT_APP_NAME).strip() or DEFAULT_APP_NAME,
        app_tagline=(row.app_tagline or DEFAULT_APP_TAGLINE).strip() or DEFAULT_APP_TAGLINE,
        logo_url=logo_url,
    )
