import unittest

from app.retrieval.contracts import (
    RetrievalCandidate,
)
from app.retrieval.fusion import (
    FusedCandidate,
    ReciprocalRankFusion,
)
from app.retrieval.orchestrator import (
    SceneRetrievalResult,
)
from app.retrieval.temporal import (
    TemporalRerankContext,
    TemporalReranker,
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
    async def search(
        self,
        requests,
    ) -> list[SceneRetrievalResult]:
        del requests

        return [
            SceneRetrievalResult(
                scene_id=1,
                candidates_by_modality={
                    "visual": (
                        RetrievalCandidate(
                            video_id="video_first",
                            frame_index=30,
                            timestamp_seconds=1.0,
                            raw_score=1.0,
                            rank=1,
                            modality="visual",
                            scene_id=1,
                        ),
                        RetrievalCandidate(
                            video_id="video_second",
                            frame_index=60,
                            timestamp_seconds=2.0,
                            raw_score=0.9,
                            rank=2,
                            modality="visual",
                            scene_id=1,
                        ),
                    ),
                },
            )
        ]


class ReversingTemporalReranker(
    TemporalReranker
):
    def __init__(self) -> None:
        self.received_context: (
            TemporalRerankContext
            | None
        ) = None

    def rerank(
        self,
        candidates: list[FusedCandidate],
        context: TemporalRerankContext,
    ) -> list[FusedCandidate]:
        self.received_context = context

        return list(reversed(candidates))


class SearchTemporalIntegrationTests(
    unittest.IsolatedAsyncioTestCase
):
    async def test_search_uses_temporal_output(
        self,
    ) -> None:
        temporal = (
            ReversingTemporalReranker()
        )

        service = SearchService(
            orchestrator=(
                StubSearchOrchestrator()
            ),
            fusion=ReciprocalRankFusion(),
            temporal=temporal,
        )

        request = SearchRequest(
            task="task_1",
            feedback="",
            scenes=[
                QuerySceneRequest(
                    scene_id=1,
                    visual_query="first scene",
                    ocr_query="",
                    asr_query="",
                ),
                QuerySceneRequest(
                    scene_id=2,
                    visual_query="second scene",
                    ocr_query="",
                    asr_query="",
                ),
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
            response.results[0].video_id,
            "video_second",
        )

        self.assertEqual(
            response.results[1].video_id,
            "video_first",
        )

        self.assertIsNotNone(
            temporal.received_context
        )

        self.assertEqual(
            temporal.received_context.scene_ids,
            (
                1,
                2,
            ),
        )

        self.assertEqual(
            temporal
            .received_context
            .window_seconds,
            5.0,
        )


if __name__ == "__main__":
    unittest.main()