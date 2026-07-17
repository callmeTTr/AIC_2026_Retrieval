from app.retrieval.adapters.mock import (
    OcrRetrievalAdapter,
    VisualRetrievalAdapter,
)
import unittest

from app.retrieval.contracts import (
    RetrievalAdapter,
    RetrievalCandidate,
    RetrievalQuery,
)
from app.retrieval.orchestrator import (
    ModalityQuery,
    SceneRetrievalRequest,
    SearchOrchestrator,
)
from app.retrieval.registry import (
    AdapterRegistry,
)


class FailingVisualAdapter(
    RetrievalAdapter
):
    @property
    def modality(self):
        return "visual"

    async def search(
        self,
        query: RetrievalQuery,
    ) -> list[RetrievalCandidate]:
        del query

        raise RuntimeError(
            "internal-secret-detail"
        )


class HealthyOcrAdapter(
    RetrievalAdapter
):
    @property
    def modality(self):
        return "ocr"

    async def search(
        self,
        query: RetrievalQuery,
    ) -> list[RetrievalCandidate]:
        return [
            RetrievalCandidate(
                video_id="ocr_video_001",
                frame_index=30,
                timestamp_seconds=1.0,
                raw_score=0.9,
                rank=1,
                modality="ocr",
                scene_id=query.scene_id,
            )
        ]


class OrchestratorErrorHandlingTests(
    unittest.IsolatedAsyncioTestCase
):
    async def test_keeps_healthy_adapter_results(
        self,
    ) -> None:
        registry = AdapterRegistry()

        registry.register(
            FailingVisualAdapter()
        )
        registry.register(
            HealthyOcrAdapter()
        )

        orchestrator = SearchOrchestrator(
            registry
        )

        request = SceneRetrievalRequest(
            scene_id=2,
            top_k=10,
            queries=(
                ModalityQuery(
                    modality="visual",
                    text="a person walking",
                ),
                ModalityQuery(
                    modality="ocr",
                    text="OPEN",
                ),
            ),
        )

        result = await (
            orchestrator.search_scene(
                request
            )
        )

        self.assertNotIn(
            "visual",
            result.candidates_by_modality,
        )

        self.assertEqual(
            len(
                result
                .candidates_by_modality[
                    "ocr"
                ]
            ),
            1,
        )

        self.assertEqual(
            len(result.issues),
            1,
        )

        issue = result.issues[0]

        self.assertEqual(
            issue.module,
            "retrieval.visual",
        )
        self.assertEqual(
            issue.code,
            "adapter_search_failed",
        )
        self.assertEqual(
            issue.severity,
            "warning",
        )
        self.assertEqual(
            issue.scene_id,
            2,
        )
        self.assertEqual(
            issue.modality,
            "visual",
        )

        self.assertIn(
            "RuntimeError",
            issue.message,
        )

        self.assertNotIn(
            "internal-secret-detail",
            issue.message,
        )
    async def test_mock_failure_trigger_creates_warning(
        self,
    ) -> None:
        registry = AdapterRegistry()

        registry.register(
            VisualRetrievalAdapter()
        )
        registry.register(
            OcrRetrievalAdapter()
        )

        orchestrator = SearchOrchestrator(
            registry
        )

        request = SceneRetrievalRequest(
            scene_id=1,
            top_k=3,
            queries=(
                ModalityQuery(
                    modality="visual",
                    text="__fail_visual__",
                ),
                ModalityQuery(
                    modality="ocr",
                    text="OPEN",
                ),
            ),
        )

        result = await (
            orchestrator.search_scene(
                request
            )
        )

        self.assertNotIn(
            "visual",
            result.candidates_by_modality,
        )

        self.assertEqual(
            len(
                result
                .candidates_by_modality[
                    "ocr"
                ]
            ),
            3,
        )

        self.assertEqual(
            len(result.issues),
            1,
        )

        self.assertEqual(
            result.issues[0].modality,
            "visual",
        )

        self.assertEqual(
            result.issues[0].code,
            "adapter_search_failed",
        )

if __name__ == "__main__":
    unittest.main()