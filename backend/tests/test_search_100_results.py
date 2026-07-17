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
from app.retrieval.temporal import (
    NoOpTemporalReranker,
)
from app.schemas.search import (
    QuerySceneRequest,
    SearchOptions,
    SearchRequest,
)
from app.services.search_service import (
    SearchService,
)


class SearchHundredResultsTests(
    unittest.IsolatedAsyncioTestCase
):
    async def asyncSetUp(self) -> None:
        registry = AdapterRegistry()

        register_default_adapters(
            registry
        )

        self.service = SearchService(
            orchestrator=SearchOrchestrator(
                registry
            ),
            fusion=ReciprocalRankFusion(),
            temporal=NoOpTemporalReranker(),
        )

    async def test_returns_exactly_100_unique_results(
        self,
    ) -> None:
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
                top_k_per_modality=100,
                display_result_count=100,
            ),
        )

        response = await self.service.search(
            request
        )

        self.assertEqual(
            response.total_results,
            100,
        )

        self.assertEqual(
            len(response.results),
            100,
        )

        result_keys = {
            (
                result.video_id,
                result.frame_index,
            )
            for result in response.results
        }

        self.assertEqual(
            len(result_keys),
            100,
        )

    async def test_ranks_are_contiguous_and_scores_sorted(
        self,
    ) -> None:
        request = SearchRequest(
            task="task_1",
            feedback="",
            scenes=[
                QuerySceneRequest(
                    scene_id=1,
                    visual_query="city traffic",
                    ocr_query="DOWNTOWN",
                    asr_query="breaking news",
                )
            ],
            options=SearchOptions(
                top_k_per_modality=100,
                display_result_count=100,
            ),
        )

        response = await self.service.search(
            request
        )

        self.assertEqual(
            [
                result.rank
                for result in response.results
            ],
            list(range(1, 101)),
        )

        scores = [
            result.score
            for result in response.results
        ]

        self.assertEqual(
            scores,
            sorted(
                scores,
                reverse=True,
            ),
        )

    async def test_results_are_frontend_compatible(
        self,
    ) -> None:
        request = SearchRequest(
            task="task_1",
            feedback="",
            scenes=[
                QuerySceneRequest(
                    scene_id=1,
                    visual_query="outdoor scene",
                    ocr_query="WELCOME",
                    asr_query="hello everyone",
                )
            ],
            options=SearchOptions(
                top_k_per_modality=100,
                display_result_count=100,
            ),
        )

        response = await self.service.search(
            request
        )

        self.assertEqual(
            response.warnings,
            [],
        )

        self.assertTrue(
            response.results[0]
            .video_id
            .startswith("shared_video_")
        )

        for result in response.results:
            self.assertGreaterEqual(
                result.timestamp_seconds,
                1.0,
            )

            self.assertLessEqual(
                result.timestamp_seconds,
                3.75,
            )

            self.assertTrue(
                result.thumbnail_url
            )

            self.assertTrue(
                result.frame_url
            )

            self.assertEqual(
                result.matched_scene,
                1,
            )

        serialized_response = (
            response.model_dump_json()
        )

        self.assertIn(
            '"total_results":100',
            serialized_response,
        )


if __name__ == "__main__":
    unittest.main()