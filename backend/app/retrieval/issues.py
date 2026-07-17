from dataclasses import dataclass
from typing import Literal

from app.retrieval.contracts import (
    RetrievalModality,
)


RetrievalIssueSeverity = Literal[
    "warning",
    "error",
]


@dataclass(frozen=True, slots=True)
class RetrievalIssue:
    """
    One recoverable or fatal issue raised by the retrieval
    pipeline.

    Recoverable module failures can be returned to the API as
    warnings while results from healthy modules remain usable.
    """

    module: str
    code: str
    message: str
    severity: RetrievalIssueSeverity
    scene_id: int | None = None
    modality: RetrievalModality | None = None


def create_adapter_failure_issue(
    *,
    scene_id: int,
    modality: RetrievalModality,
    error: Exception,
) -> RetrievalIssue:
    """
    Convert an adapter exception into a safe public issue.

    The exception class is retained for debugging, but internal
    stack traces and sensitive details are not exposed.
    """

    error_name = type(error).__name__

    return RetrievalIssue(
        module=f"retrieval.{modality}",
        code="adapter_search_failed",
        message=(
            f"The {modality.upper()} retrieval module "
            f"failed with {error_name}. Results from other "
            "available modules were kept."
        ),
        severity="warning",
        scene_id=scene_id,
        modality=modality,
    )