from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.work_session import WorkSession


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    processing_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="completed", server_default="completed", index=True
    )
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raw_ai_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    calculated_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    primary_issue: Mapped[str | None] = mapped_column(String(512), nullable=True)
    professional_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes_author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    review_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending", server_default="pending", index=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    expert_calculated_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    expert_primary_issue: Mapped[str | None] = mapped_column(String(512), nullable=True)
    expert_vision_patch: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    expert_review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    work_session: Mapped["WorkSession"] = relationship("WorkSession", back_populates="assessments")
    notes_author: Mapped["User | None"] = relationship("User", foreign_keys=[notes_author_id])
    reviewed_by: Mapped["User | None"] = relationship("User", foreign_keys=[reviewed_by_id])
