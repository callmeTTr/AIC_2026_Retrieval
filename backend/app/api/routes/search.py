from fastapi import APIRouter

from app.schemas.search import (
    SearchRequest,
    SearchResponse,
)
from app.services.search_service import (
    search_service,
)


router = APIRouter()


@router.post(
    "/search",
    response_model=SearchResponse,
)
async def search_videos(
    request: SearchRequest,
) -> SearchResponse:
    return await search_service.search(
        request
    )