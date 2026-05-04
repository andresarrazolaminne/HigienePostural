from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.assessment import Assessment
    from app.models.site import Site
    from app.models.user import User


class WorkSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    site_id: Mapped[int | None] = mapped_column(
        ForeignKey("sites.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    average_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    differential_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="work_sessions")
    site: Mapped["Site | None"] = relationship("Site", back_populates="work_sessions")
    assessments: Mapped[list["Assessment"]] = relationship(
        "Assessment", back_populates="work_session", cascade="all, delete-orphan"
    )
