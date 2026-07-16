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


def format_timestamp(seconds: float) -> str:
    milliseconds = int((seconds % 1) * 1000)
    total_seconds = int(seconds)

    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    remaining_seconds = total_seconds % 60

    return (
        f"{hours:02d}:"
        f"{minutes:02d}:"
        f"{remaining_seconds:02d}."
        f"{milliseconds:03d}"
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
        12,
    )

    results: list[SearchResult] = []

    for index in range(result_count):
        timestamp_seconds = 20.5 + index * 7.25
        score = round(0.96 - index * 0.025, 3)

        results.append(
            SearchResult(
                rank=index + 1,
                video_id=f"L01_V{index + 1:03d}",
                frame_index=300 + index * 90,
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
                        if request.scenes[0].ocr_query
                        else None
                    ),
                    asr=(
                        round(score - 0.12, 3)
                        if request.scenes[0].asr_query
                        else None
                    ),
                ),
            )
        )

    processing_time_ms = int(
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