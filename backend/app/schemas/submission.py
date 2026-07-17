from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.task import TaskId


SubmissionStatus = Literal[
    "accepted",
    "rejected",
]


class SubmissionRequest(BaseModel):
    """Data required to submit one selected search result."""

    task: TaskId

    search_id: UUID

    video_id: str = Field(
        min_length=1,
        max_length=200,
    )

    frame_index: int = Field(
        ge=0,
    )

    timestamp_seconds: float = Field(
        ge=0,
    )


class SubmissionResponse(BaseModel):
    """Result returned after processing a submission."""

    submission_id: UUID

    status: SubmissionStatus

    task: TaskId

    search_id: UUID

    video_id: str

    frame_index: int

    timestamp_seconds: float

    submitted_at: datetime

    message: str