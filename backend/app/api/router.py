from fastapi import APIRouter

from app.api.routes.frames import router as frames_router
from app.api.routes.health import router as health_router
from app.api.routes.refinements import (
    router as refinements_router,
)
from app.api.routes.search import router as search_router
from app.api.routes.submissions import (
    router as submissions_router,
)
from app.api.routes.videos import router as videos_router


api_router = APIRouter()

api_router.include_router(
    health_router,
    tags=["Health"],
)

api_router.include_router(
    search_router,
    tags=["Search"],
)

api_router.include_router(
    refinements_router,
    tags=["Refinements"],
)

api_router.include_router(
    frames_router,
    tags=["Frames"],
)

api_router.include_router(
    videos_router,
    tags=["Videos"],
)

api_router.include_router(
    submissions_router,
    tags=["Submissions"],
)