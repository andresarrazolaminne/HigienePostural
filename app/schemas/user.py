from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str = Field(..., max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.user
    company_id: int | None = None


class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    baseline_score: float | None
    company_id: int | None
    access_pin: str | None = None
    expert_company_ids: list[int] = Field(default_factory=list)

    model_config = {"from_attributes": True}
