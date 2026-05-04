from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=8)
    role: UserRole | None = None
    company_id: int | None = None
