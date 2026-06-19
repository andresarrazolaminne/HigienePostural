from datetime import datetime

from typing import Any



from pydantic import BaseModel, Field



from app.schemas.vision import VisionAnalysisResult





class AssessmentUploadQueuedResponse(BaseModel):
    assessment_id: int
    session_id: int
    processing_status: str = "queued"
    image_url: str | None = None
    queue_position: int | None = Field(None, description="Posición aproximada en cola (1 = siguiente)")


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

    vision: VisionAnalysisResult | None = None
    processing_status: str = "completed"

    image_url: str | None = None

    orden_aseo_score: float | None = None

    orden_aseo_issue: str | None = None

    orden_aseo_observations: list[str] = Field(default_factory=list)





class AssessmentListItem(BaseModel):

    model_config = {"from_attributes": True}



    id: int

    session_id: int

    site_id: int | None

    calculated_score: float | None = None

    primary_issue: str | None = None

    processing_status: str = "completed"

    processing_error: str | None = None

    created_at: datetime

    has_professional_notes: bool = False

    image_url: str | None = None

    orden_aseo_score: float | None = None

    orden_aseo_issue: str | None = None

    review_status: str = "pending"
    expert_reviewed: bool = False
    score_is_provisional: bool = False


class AssessmentNotesUpdate(BaseModel):

    professional_notes: str | None = Field(None, max_length=4000)





class AssessmentDetailRead(AssessmentListItem):

    orden_aseo_observations: list[str] = Field(default_factory=list)

    raw_ai_json: dict[str, Any] | None = None
    processed_at: datetime | None = None

    professional_notes: str | None = None

    notes_updated_at: datetime | None = None

    notes_author_name: str | None = None

