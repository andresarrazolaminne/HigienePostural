from pydantic import BaseModel, Field


class BrandingRead(BaseModel):
    app_name: str
    app_tagline: str
    logo_url: str | None = None


class BrandingUpdate(BaseModel):
    app_name: str | None = Field(None, max_length=120)
    app_tagline: str | None = Field(None, max_length=200)
