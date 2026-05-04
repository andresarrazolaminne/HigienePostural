from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.site import Site
    from app.models.user import User


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    sites: Mapped[list["Site"]] = relationship("Site", back_populates="company", cascade="all, delete-orphan")
    users: Mapped[list["User"]] = relationship("User", back_populates="company")
