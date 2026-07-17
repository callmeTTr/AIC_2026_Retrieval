import unittest

from app.retrieval.contracts import (
    RetrievalCandidate,
)
from app.retrieval.fusion import (
    ReciprocalRankFusion,
)
from app.retrieval.issues import (
    RetrievalIssue,
)
from app.retrieval.orchestrator import (
    SceneRetrievalResult,
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


class StubWarningOrchestrator:
    async def search(
        self,
        requests,
    ) -> list[SceneRetrievalResult]:
        del requests

        return [
            SceneRetrievalResult(
                scene_id=1,
                candidates_by_modality={
                    "ocr": (
                        RetrievalCandidate(
                            video_id="ocr_video_001",
                            frame_index=30,
                            timestamp_seconds=1.0,
                            raw_score=0.9,
                            rank=1,
                            modality="ocr",
                            scene_id=1,
                        ),
                    ),
                },
                issues=(
                    RetrievalIssue(
                        module=(
                            "retrieval.visual"
                        ),
                        code=(
                            "adapter_search_failed"
                        ),
                        message=(
                            "The VISUAL retrieval "
                            "module failed. Results "
                            "from other available "
                            "modules were kept."
                        ),
                        severity="warning",
                        scene_id=1,
                        modality="visual",
                    ),
                ),
            )
        ]


class SearchWarningMappingTests(
    unittest.IsolatedAsyncioTestCase
):
    async def test_maps_retrieval_issue_to_warning(
        self,
    ) -> None:
        service = SearchService(
            orchestrator=(
                StubWarningOrchestrator()
            ),
            fusion=ReciprocalRankFusion(),
            temporal=NoOpTemporalReranker(),
        )

        request = SearchRequest(
            task="task_1",
            feedback="",
            scenes=[
                QuerySceneRequest(
                    scene_id=1,
                    visual_query=(
                        "person walking"
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
            1,
        )

        self.assertEqual(
            response.results[0].video_id,
            "ocr_video_001",
        )

        self.assertEqual(
            len(response.warnings),
            1,
        )

        warning = response.warnings[0]

        self.assertEqual(
            warning.module,
            "retrieval.visual",
        )

        self.assertEqual(
            warning.code,
            "adapter_search_failed",
        )

        self.assertIn(
            "VISUAL retrieval module failed",
            warning.message,
        )


if __name__ == "__main__":
    unittest.main()