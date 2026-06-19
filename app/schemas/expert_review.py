from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ExpertReviewUpdate(BaseModel):
    action: Literal["approve", "correct"]
    calculated_score: float | None = Field(None, ge=0, le=100)
    primary_issue: str | None = Field(None, max_length=512)
    vision_patch: dict[str, Any] | None = None
    review_notes: str | None = Field(None, max_length=4000)


class AssessmentAiSnapshot(BaseModel):
    calculated_score: float | None = None
    primary_issue: str | None = None
    vision: dict[str, Any] | None = None


class AssessmentReviewState(BaseModel):
    status: str
    expert_calculated_score: float | None = None
    expert_primary_issue: str | None = None
    expert_vision_patch: dict[str, Any] | None = None
    expert_review_notes: str | None = None
    reviewed_at: datetime | None = None
    reviewed_by_name: str | None = None


class AssessmentReviewQueueItem(BaseModel):
    id: int
    session_id: int
    site_id: int | None
    site_name: str | None
    company_id: int | None
    company_name: str | None
    inspector_name: str | None
    ai_calculated_score: float | None
    ai_primary_issue: str | None
    review_status: str
    created_at: datetime
    image_url: str | None = None


class ExpertCompanyIdsUpdate(BaseModel):
    company_ids: list[int] = Field(default_factory=list)


class AssessmentDetailExpertRead(BaseModel):
    """Detalle completo para experto / admin (incluye IA original y revisión)."""

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
    orden_aseo_observations: list[str] = Field(default_factory=list)
    review_status: str = "pending"
    expert_reviewed: bool = False
    score_is_provisional: bool = False
    processed_at: datetime | None = None
    professional_notes: str | None = None
    notes_updated_at: datetime | None = None
    notes_author_name: str | None = None
    ai: AssessmentAiSnapshot | None = None
    review: AssessmentReviewState | None = None
