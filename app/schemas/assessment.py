from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.vision import VisionAnalysisResult


class AssessmentUploadResponse(BaseModel):
    assessment_id: int
    session_id: int
    calculated_score: float
    primary_issue: str
    session_average_score: float | None
    session_differential_score: float | None
    intra_session_delta: float | None = Field(
        None, description="Diferencia vs assessment anterior en la misma sesión."
    )
    inter_session_delta: float | None = Field(
        None, description="Diferencia vs baseline del usuario, si existía."
    )
    vision: VisionAnalysisResult


class AssessmentListItem(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    session_id: int
    site_id: int | None
    calculated_score: float
    primary_issue: str
    created_at: datetime


class AssessmentDetailRead(AssessmentListItem):
    raw_ai_json: dict[str, Any]
    image_path: str
