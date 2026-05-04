from pydantic import BaseModel, ConfigDict, Field


class CompanyCreate(BaseModel):
    name: str = Field(..., max_length=255)


class CompanyUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)


class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
