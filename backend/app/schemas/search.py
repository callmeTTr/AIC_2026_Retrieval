from typing import Literal

from pydantic import BaseModel, Field, model_validator


TaskId = Literal[
    "task_1",
    "task_2",
    "task_3",
    "task_4",
]


class QuerySceneRequest(BaseModel):
    scene_id: int = Field(ge=1)
    visual_query: str = ""
    ocr_query: str = ""
    asr_query: str = ""

    @model_validator(mode="after")
    def validate_at_least_one_query(self):
        has_query = any(
            (
                self.visual_query.strip(),
                self.ocr_query.strip(),
                self.asr_query.strip(),
            )
        )

        if not has_query:
            raise ValueError(
                "Each scene must contain at least one "
                "Visual, OCR or ASR query."
            )

        return self


class SearchOptions(BaseModel):
    top_k_per_modality: int = Field(
        default=100,
        ge=1,
        le=1000,
    )

    display_result_count: int = Field(
        default=100,
        ge=1,
        le=500,
    )


class SearchRequest(BaseModel):
    task: TaskId
    feedback: str = ""
    scenes: list[QuerySceneRequest] = Field(min_length=1)
    options: SearchOptions


class ModalityScores(BaseModel):
    visual: float | None = None
    ocr: float | None = None
    asr: float | None = None


class SearchResult(BaseModel):
    rank: int
    video_id: str
    frame_index: int
    timestamp_seconds: float
    timestamp_display: str
    thumbnail_url: str
    frame_url: str
    score: float
    matched_scene: int
    modality_scores: ModalityScores


class SearchWarning(BaseModel):
    module: str
    code: str
    message: str


class SearchResponse(BaseModel):
    search_id: str
    task: TaskId
    processing_time_ms: int
    total_results: int
    warnings: list[SearchWarning]
    results: list[SearchResult]