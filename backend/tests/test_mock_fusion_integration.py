import unittest

from app.retrieval.bootstrap import (
    register_default_adapters,
)
from app.retrieval.fusion import (
    ReciprocalRankFusion,
)
from app.retrieval.orchestrator import (
    SearchOrchestrator,
)
from app.retrieval.registry import (
    AdapterRegistry,
)
from app.schemas.search import (
    QuerySceneRequest,
    SearchOptions,
    SearchRequest,
)
from app.services.search_service import (
    SearchService,
)


class MockFusionIntegrationTests(
    unittest.IsolatedAsyncioTestCase
):
    async def test_shared_candidate_is_boosted_by_rrf(
        self,
    ) -> None:
        registry = AdapterRegistry()

        register_default_adapters(
            registry
        )

        orchestrator = SearchOrchestrator(
            registry
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
                        "a person riding a bicycle"
                    ),
                    ocr_query="BIKE SHOP",
                    asr_query=(
                        "welcome to the show"
                    ),
                )
            ],
            options=SearchOptions(
                top_k_per_modality=8,
                display_result_count=20,
            ),
        )

        response = await service.search(
            request
        )

        self.assertEqual(
            response.total_results,
            20,
        )

        top_result = response.results[0]

        self.assertTrue(
            top_result.video_id.startswith(
                "shared_video_"
            )
        )

        self.assertIsNotNone(
            top_result
            .modality_scores
            .visual
        )

        self.assertIsNotNone(
            top_result
            .modality_scores
            .ocr
        )

        self.assertIsNotNone(
            top_result
            .modality_scores
            .asr
        )

        self.assertGreater(
            top_result.score,
            response.results[1].score,
        )


if __name__ == "__main__":
    unittest.main()