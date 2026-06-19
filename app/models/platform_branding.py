from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PlatformBranding(Base):
    """Configuración global de marca (singleton, id=1)."""

    __tablename__ = "platform_branding"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    app_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    app_tagline: Mapped[str | None] = mapped_column(String(200), nullable=True)
    logo_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
