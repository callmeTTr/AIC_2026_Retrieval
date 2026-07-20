from hashlib import sha256
from time import perf_counter
from uuid import uuid4

from app.schemas.refinement import (
    RefinementRequest,
    RefinementResponse,
)
from app.schemas.search import (
    SearchRequest,
    SearchResult,
    SearchWarning,
)
from app.services.search_service import (
    SearchService,
    search_service,
)


class RefinementService:
    """
    Process result-level textual refinement.

    The current implementation is a deterministic
    mock. It reuses the existing search pipeline and
    reorders its results based on the selected frame
    and textual feedback.

    A real composed-image retrieval adapter can later
    replace the mock reranking logic without changing
    the HTTP route or frontend contract.
    """

    def __init__(
        self,
        base_search_service: SearchService = (
            search_service
        ),
    ) -> None:
        self._base_search_service = (
            base_search_service
        )

    async def refine(
        self,
        request: RefinementRequest,
    ) -> RefinementResponse:
        start_time = perf_counter()

        base_response = (
            await self._base_search_service.search(
                SearchRequest(
                    task=request.task,
                    feedback="",
                    scenes=request.original_scenes,
                    options=request.options,
                )
            )
        )

        results = self._rerank_mock_results(
            base_response.results,
            request,
        )

        processing_time_ms = round(
            (
                perf_counter()
                - start_time
            )
            * 1000
        )

        return RefinementResponse(
            search_id=str(uuid4()),
            parent_search_id=(
                request.parent_search_id
            ),
            refinement_iteration=(
                request.refinement_iteration
            ),
            task=request.task,
            processing_time_ms=(
                processing_time_ms
            ),
            total_results=len(results),
            warnings=[
                *base_response.warnings,
                SearchWarning(
                    module="refinement.mock",
                    code="mock_refinement",
                    message=(
                        "Results were deterministically "
                        "reordered by the mock refinement "
                        "service. No semantic image-text "
                        "model was used."
                    ),
                ),
            ],
            results=results,
        )

    @staticmethod
    def _rerank_mock_results(
        results: list[SearchResult],
        request: RefinementRequest,
    ) -> list[SearchResult]:
        reference = request.reference_result

        refinement_seed = "|".join(
            (
                reference.video_id,
                str(reference.frame_index),
                request.feedback.casefold(),
            )
        )

        def build_sort_key(
            result: SearchResult,
        ) -> tuple[int, str]:
            candidate_seed = "|".join(
                (
                    refinement_seed,
                    result.video_id,
                    str(result.frame_index),
                )
            )

            deterministic_hash = sha256(
                candidate_seed.encode("utf-8")
            ).hexdigest()

            is_different_video = int(
                result.video_id
                != reference.video_id
            )

            return (
                is_different_video,
                deterministic_hash,
            )

        reordered_results = sorted(
            results,
            key=build_sort_key,
        )

        return [
            result.model_copy(
                update={
                    "rank": index + 1,
                }
            )
            for index, result in enumerate(
                reordered_results
            )
        ]


refinement_service = RefinementService()