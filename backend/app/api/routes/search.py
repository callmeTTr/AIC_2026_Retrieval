from time import perf_counter
from uuid import uuid4

from fastapi import APIRouter

from app.schemas.search import (
    ModalityScores,
    SearchRequest,
    SearchResponse,
    SearchResult,
)


router = APIRouter()


MOCK_RESULT_LIMIT = 12
MOCK_VIDEO_FPS = 30
MOCK_TIMESTAMP_START_SECONDS = 1.0
MOCK_TIMESTAMP_STEP_SECONDS = 0.25


def format_timestamp(seconds: float) -> str:
    total_milliseconds = round(seconds * 1000)

    hours, remaining_milliseconds = divmod(
        total_milliseconds,
        3_600_000,
    )

    minutes, remaining_milliseconds = divmod(
        remaining_milliseconds,
        60_000,
    )

    remaining_seconds, milliseconds = divmod(
        remaining_milliseconds,
        1000,
    )

    return (
        f"{hours:02d}:"
        f"{minutes:02d}:"
        f"{remaining_seconds:02d}."
        f"{milliseconds:03d}"
    )


def build_mock_timestamp(result_index: int) -> float:
    """
    Return a timestamp inside the current five-second mock video.

    Replace this helper when real retrieval results are connected.
    """

    return round(
        MOCK_TIMESTAMP_START_SECONDS
        + result_index * MOCK_TIMESTAMP_STEP_SECONDS,
        3,
    )


@router.post(
    "/search",
    response_model=SearchResponse,
)
async def search_videos(
    request: SearchRequest,
) -> SearchResponse:
    start_time = perf_counter()

    result_count = min(
        request.options.display_result_count,
        MOCK_RESULT_LIMIT,
    )

    results: list[SearchResult] = []

    for index in range(result_count):
        timestamp_seconds = build_mock_timestamp(index)

        frame_index = round(
            timestamp_seconds * MOCK_VIDEO_FPS
        )

        score = round(
            0.96 - index * 0.025,
            3,
        )

        first_scene = request.scenes[0]

        results.append(
            SearchResult(
                rank=index + 1,
                video_id=f"L01_V{index + 1:03d}",
                frame_index=frame_index,
                timestamp_seconds=timestamp_seconds,
                timestamp_display=format_timestamp(
                    timestamp_seconds
                ),
                thumbnail_url=(
                    "https://picsum.photos/"
                    f"seed/aic-{index + 1}/640/360"
                ),
                frame_url=(
                    "https://picsum.photos/"
                    f"seed/aic-{index + 1}/1280/720"
                ),
                score=score,
                matched_scene=1,
                modality_scores=ModalityScores(
                    visual=score,
                    ocr=(
                        round(score - 0.08, 3)
                        if first_scene.ocr_query
                        else None
                    ),
                    asr=(
                        round(score - 0.12, 3)
                        if first_scene.asr_query
                        else None
                    ),
                ),
            )
        )

    processing_time_ms = round(
        (perf_counter() - start_time) * 1000
    )

    return SearchResponse(
        search_id=str(uuid4()),
        task=request.task,
        processing_time_ms=processing_time_ms,
        total_results=len(results),
        warnings=[],
        results=results,
    )