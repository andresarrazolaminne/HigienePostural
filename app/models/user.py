import enum
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.work_session import WorkSession


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    company_admin = "company_admin"
    expert = "expert"
    user = "user"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    # Clave de ingreso numérica (PIN) para login simplificado. Única; opcional.
    access_pin: Mapped[str | None] = mapped_column(
        String(12), unique=True, index=True, nullable=True
    )
    role: Mapped[UserRole] = mapped_column(
        SAEnum(
            UserRole,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
        default=UserRole.user,
    )
    baseline_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    company_id: Mapped[int | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True
    )

    company: Mapped["Company | None"] = relationship("Company", back_populates="users")
    work_sessions: Mapped[list["WorkSession"]] = relationship(
        "WorkSession", back_populates="user", cascade="all, delete-orphan"
    )
