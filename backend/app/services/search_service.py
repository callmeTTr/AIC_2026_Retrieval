from time import perf_counter
from uuid import uuid4

from app.retrieval import (
    ModalityQuery,
    SceneRetrievalRequest,
    SearchOrchestrator,
    search_orchestrator,
)
from app.retrieval.contracts import (
    RetrievalCandidate,
    RetrievalModality,
)
from app.schemas.search import (
    ModalityScores,
    SearchRequest,
    SearchResponse,
    SearchResult,
)


MODALITY_ORDER: dict[
    RetrievalModality,
    int,
] = {
    "visual": 0,
    "ocr": 1,
    "asr": 2,
}


class SearchService:
    """
    Convert API search requests into retrieval requests.

    Fusion is intentionally not handled here yet. Raw
    candidates are normalized into the current API response
    contract so the frontend can continue working.
    """

    def __init__(
        self,
        orchestrator: SearchOrchestrator = (
            search_orchestrator
        ),
    ) -> None:
        self._orchestrator = orchestrator

    async def search(
        self,
        request: SearchRequest,
    ) -> SearchResponse:
        start_time = perf_counter()

        scene_requests = (
            self._build_scene_requests(request)
        )

        scene_results = (
            await self._orchestrator.search(
                scene_requests
            )
        )

        candidates = []

        for scene_result in scene_results:
            for modality in (
                "visual",
                "ocr",
                "asr",
            ):
                candidates.extend(
                    scene_result
                    .candidates_by_modality
                    .get(modality, ())
                )

        candidates.sort(
            key=self._candidate_sort_key
        )

        selected_candidates = candidates[
            : request.options.display_result_count
        ]

        results = [
            self._build_search_result(
                candidate=candidate,
                global_rank=index + 1,
            )
            for index, candidate in enumerate(
                selected_candidates
            )
        ]

        processing_time_ms = round(
            (
                perf_counter()
                - start_time
            )
            * 1000
        )

        return SearchResponse(
            search_id=str(uuid4()),
            task=request.task,
            processing_time_ms=(
                processing_time_ms
            ),
            total_results=len(results),
            warnings=[],
            results=results,
        )

    @staticmethod
    def _build_scene_requests(
        request: SearchRequest,
    ) -> list[SceneRetrievalRequest]:
        scene_requests = []

        for scene in request.scenes:
            queries = []

            modality_texts: tuple[
                tuple[
                    RetrievalModality,
                    str,
                ],
                ...,
            ] = (
                (
                    "visual",
                    scene.visual_query,
                ),
                (
                    "ocr",
                    scene.ocr_query,
                ),
                (
                    "asr",
                    scene.asr_query,
                ),
            )

            for modality, text in modality_texts:
                normalized_text = text.strip()

                if normalized_text:
                    queries.append(
                        ModalityQuery(
                            modality=modality,
                            text=normalized_text,
                        )
                    )

            scene_requests.append(
                SceneRetrievalRequest(
                    scene_id=scene.scene_id,
                    top_k=(
                        request.options
                        .top_k_per_modality
                    ),
                    queries=tuple(queries),
                )
            )

        return scene_requests

    @staticmethod
    def _candidate_sort_key(
        candidate: RetrievalCandidate,
    ) -> tuple[
        float,
        int,
        int,
        int,
        str,
        int,
    ]:
        return (
            -candidate.raw_score,
            candidate.scene_id,
            MODALITY_ORDER[
                candidate.modality
            ],
            candidate.rank,
            candidate.video_id,
            candidate.frame_index,
        )

    @staticmethod
    def _build_search_result(
        candidate: RetrievalCandidate,
        global_rank: int,
    ) -> SearchResult:
        modality_scores = {
            "visual": None,
            "ocr": None,
            "asr": None,
        }

        modality_scores[
            candidate.modality
        ] = candidate.raw_score

        image_seed = (
            f"{candidate.video_id}-"
            f"{candidate.frame_index}"
        )

        return SearchResult(
            rank=global_rank,
            video_id=candidate.video_id,
            frame_index=(
                candidate.frame_index
            ),
            timestamp_seconds=(
                candidate.timestamp_seconds
            ),
            timestamp_display=(
                SearchService
                ._format_timestamp(
                    candidate.timestamp_seconds
                )
            ),
            thumbnail_url=(
                "https://picsum.photos/"
                f"seed/{image_seed}/640/360"
            ),
            frame_url=(
                "https://picsum.photos/"
                f"seed/{image_seed}/1280/720"
            ),
            score=candidate.raw_score,
            matched_scene=(
                candidate.scene_id
            ),
            modality_scores=ModalityScores(
                **modality_scores
            ),
        )

    @staticmethod
    def _format_timestamp(
        seconds: float,
    ) -> str:
        total_milliseconds = round(
            seconds * 1000
        )

        hours, remaining = divmod(
            total_milliseconds,
            3_600_000,
        )

        minutes, remaining = divmod(
            remaining,
            60_000,
        )

        whole_seconds, milliseconds = (
            divmod(
                remaining,
                1000,
            )
        )

        return (
            f"{hours:02d}:"
            f"{minutes:02d}:"
            f"{whole_seconds:02d}."
            f"{milliseconds:03d}"
        )


search_service = SearchService()