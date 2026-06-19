from typing import Literal

AssessmentProcessingStatus = Literal["queued", "processing", "completed", "failed"]

QUEUED: AssessmentProcessingStatus = "queued"
PROCESSING: AssessmentProcessingStatus = "processing"
COMPLETED: AssessmentProcessingStatus = "completed"
FAILED: AssessmentProcessingStatus = "failed"


def is_ready(status: str) -> bool:
    return status == COMPLETED
