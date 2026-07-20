from pydantic import (
    BaseModel,
    Field,
    field_validator,
)

from app.schemas.search import (
    QuerySceneRequest,
    SearchOptions,
    SearchResult,
    SearchWarning,
)
from app.schemas.task import TaskId


class RefinementReferenceResult(BaseModel):
    video_id: str = Field(min_length=1)
    frame_index: int = Field(ge=0)
    timestamp_seconds: float = Field(ge=0)
    thumbnail_url: str = Field(min_length=1)
    frame_url: str = Field(min_length=1)


class RefinementRequest(BaseModel):
    task: TaskId
    parent_search_id: str = Field(min_length=1)

    refinement_iteration: int = Field(
        default=1,
        ge=1,
    )

    reference_result: RefinementReferenceResult
    feedback: str = Field(min_length=1)

    original_scenes: list[
        QuerySceneRequest
    ] = Field(min_length=1)

    options: SearchOptions

    @field_validator(
        "parent_search_id",
        "feedback",
    )
    @classmethod
    def validate_non_empty_text(
        cls,
        value: str,
    ) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise ValueError(
                "Value must not be empty."
            )

        return normalized_value


class RefinementResponse(BaseModel):
    search_id: str
    parent_search_id: str
    refinement_iteration: int
    task: TaskId
    processing_time_ms: int
    total_results: int
    warnings: list[SearchWarning]
    results: list[SearchResult]