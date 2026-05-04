from pydantic import BaseModel, ConfigDict, Field


class SiteCreate(BaseModel):
    company_id: int
    name: str = Field(..., max_length=255)
    address: str | None = None


class SiteUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    address: str | None = None


class SiteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    name: str
    address: str | None
