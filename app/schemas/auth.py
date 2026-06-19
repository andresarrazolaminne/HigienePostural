from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginCode(BaseModel):
    code: str = Field(..., min_length=4, max_length=12)
