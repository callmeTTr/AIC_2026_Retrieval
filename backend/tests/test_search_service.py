import unittest

from app.retrieval.contracts import (
    RetrievalCandidate,
)
from app.retrieval.fusion import (
    ReciprocalRankFusion,
)
from app.retrieval.orchestrator import (
    SceneRetrievalResult,
)
from app.schemas.search import (
    QuerySceneRequest,
    SearchOptions,
    SearchRequest,
)
from app.services.search_service import (
    SearchService,
)


class StubSearchOrchestrator:
    def __init__(
        self,
        scene_results: list[
            SceneRetrievalResult
        ],
    ) -> None:
        self._scene_results = scene_results
        self.received_requests = []

    async def search(
        self,
        requests,
    ) -> list[SceneRetrievalResult]:
        self.received_requests = list(
            requests
        )

        return self._scene_results


def create_candidate(
    *,
    video_id: str,
    frame_index: int,
    rank: int,
    modality: str,
    raw_score: float,
) -> RetrievalCandidate:
    return RetrievalCandidate(
        video_id=video_id,
        frame_index=frame_index,
        timestamp_seconds=(
            frame_index / 30
        ),
        raw_score=raw_score,
        rank=rank,
        modality=modality,
        scene_id=1,
    )


class SearchServiceTests(
    unittest.IsolatedAsyncioTestCase
):
    async def test_search_uses_rrf_ranking(
        self,
    ) -> None:
        scene_result = SceneRetrievalResult(
            scene_id=1,
            candidates_by_modality={
                "visual": (
                    create_candidate(
                        video_id="visual_only",
                        frame_index=60,
                        rank=1,
                        modality="visual",
                        raw_score=0.95,
                    ),
                    create_candidate(
                        video_id="shared",
                        frame_index=30,
                        rank=2,
                        modality="visual",
                        raw_score=0.85,
                    ),
                ),
                "ocr": (
                    create_candidate(
                        video_id="shared",
                        frame_index=30,
                        rank=1,
                        modality="ocr",
                        raw_score=0.90,
                    ),
                ),
            },
        )

        orchestrator = StubSearchOrchestrator(
            [scene_result]
        )

        service = SearchService(
            orchestrator=orchestrator,
            fusion=ReciprocalRankFusion(),
        )

        request = SearchRequest(
            task="task_1",
            feedback="",
            scenes=[
                QuerySceneRequest(
                    scene_id=1,
                    visual_query=(
                        "person near a sign"
                    ),
                    ocr_query="OPEN",
                    asr_query="",
                )
            ],
            options=SearchOptions(
                top_k_per_modality=10,
                display_result_count=10,
            ),
        )

        response = await service.search(
            request
        )

        self.assertEqual(
            response.total_results,
            2,
        )

        self.assertEqual(
            response.results[0].video_id,
            "shared",
        )

        self.assertEqual(
            response.results[0]
            .modality_scores.visual,
            0.85,
        )

        self.assertEqual(
            response.results[0]
            .modality_scores.ocr,
            0.90,
        )

        self.assertIsNone(
            response.results[0]
            .modality_scores.asr
        )

        self.assertGreater(
            response.results[0].score,
            response.results[1].score,
        )

        self.assertEqual(
            len(
                orchestrator
                .received_requests
            ),
            1,
        )

        received_request = (
            orchestrator
            .received_requests[0]
        )

        self.assertEqual(
            received_request.top_k,
            10,
        )

        self.assertEqual(
            [
                query.modality
                for query
                in received_request.queries
            ],
            [
                "visual",
                "ocr",
            ],
        )


if __name__ == "__main__":
    unittest.main()