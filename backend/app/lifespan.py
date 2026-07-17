from collections.abc import (
    AsyncIterator,
)
from contextlib import (
    asynccontextmanager,
)

from fastapi import FastAPI

from app.retrieval import (
    register_default_adapters,
)


@asynccontextmanager
async def application_lifespan(
    _: FastAPI,
) -> AsyncIterator[None]:
    """
    Initialize application-level services.

    Retrieval adapters are registered once when
    the FastAPI application starts.
    """

    register_default_adapters()

    yield