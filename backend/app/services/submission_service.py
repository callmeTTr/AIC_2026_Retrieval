from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.submission import (
    SubmissionRequest,
    SubmissionResponse,
)


class SubmissionService:
    """
    Handles submission processing.

    The current implementation accepts every valid submission.
    Later, this service can call the official competition API
    without changing the route or frontend.
    """

    async def submit(
        self,
        request: SubmissionRequest,
    ) -> SubmissionResponse:
        return SubmissionResponse(
            submission_id=uuid4(),
            status="accepted",
            task=request.task,
            search_id=request.search_id,
            video_id=request.video_id,
            frame_index=request.frame_index,
            timestamp_seconds=request.timestamp_seconds,
            submitted_at=datetime.now(timezone.utc),
            message=(
                "Submission accepted by the mock backend."
            ),
        )


submission_service = SubmissionService()