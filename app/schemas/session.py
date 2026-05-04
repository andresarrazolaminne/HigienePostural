from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WorkSessionCreate(BaseModel):
    """Crear sesión de evaluación en una sede."""

    model_config = ConfigDict(extra="forbid")

    site_id: int


class WorkSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    site_id: int | None
    start_time: datetime
    end_time: datetime | None
    average_score: float | None
    differential_score: float | None
    assessment_count: int = 0
    min_score: float | None = None
    max_score: float | None = None


class WorkSessionEnd(BaseModel):
    end_time: datetime | None = None
