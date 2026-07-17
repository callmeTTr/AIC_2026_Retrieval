from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config.settings import settings
from app.lifespan import (
    application_lifespan,
)

def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        lifespan=application_lifespan,
        version="0.1.0",
        description="Backend API for the AIC 2026 video retrieval system.",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(
        api_router,
        prefix=settings.api_prefix,
    )

    return application


app = create_application()