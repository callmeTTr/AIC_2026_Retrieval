from fastapi import (
    APIRouter,
    status,
)

from app.schemas.submission import (
    SubmissionRequest,
    SubmissionResponse,
)
from app.services.submission_service import (
    submission_service,
)


router = APIRouter(
    prefix="/submissions",
)


@router.post(
    "",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_submission(
    request: SubmissionRequest,
) -> SubmissionResponse:
    """
    Submit one selected search result.

    The route only handles HTTP concerns. Submission processing
    is delegated to SubmissionService.
    """

    return await submission_service.submit(request)