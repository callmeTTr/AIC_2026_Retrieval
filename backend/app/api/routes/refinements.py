from fastapi import APIRouter

from app.schemas.refinement import (
    RefinementRequest,
    RefinementResponse,
)
from app.services.refinement_service import (
    refinement_service,
)


router = APIRouter(
    prefix="/refinements",
)


@router.post(
    "",
    response_model=RefinementResponse,
)
async def refine_search_results(
    request: RefinementRequest,
) -> RefinementResponse:
    """
    Refine search results from one selected frame
    and a textual modification instruction.

    The current service is deterministic mock logic.
    A real composed-image retrieval model can later
    replace the service implementation without
    changing this route contract.
    """

    return await refinement_service.refine(
        request
    )