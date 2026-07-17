import unittest

from app.retrieval.bootstrap import (
    register_default_adapters,
)
from app.retrieval.orchestrator import (
    ModalityQuery,
    SceneRetrievalRequest,
    SearchOrchestrator,
)
from app.retrieval.registry import (
    AdapterNotRegisteredError,
    AdapterRegistry,
)


class SearchOrchestratorTests(
    unittest.IsolatedAsyncioTestCase
):
    def setUp(self) -> None:
        self.registry = AdapterRegistry()

        register_default_adapters(
            self.registry
        )

        self.orchestrator = SearchOrchestrator(
            self.registry
        )

    async def test_searches_selected_modalities(
        self,
    ) -> None:
        request = SceneRetrievalRequest(
            scene_id=1,
            top_k=3,
            queries=(
                ModalityQuery(
                    modality="visual",
                    text=(
                        "a person riding "
                        "a bicycle"
                    ),
                ),
                ModalityQuery(
                    modality="ocr",
                    text="BIKE SHOP",
                ),
            ),
        )

        result = await (
            self.orchestrator.search_scene(
                request
            )
        )

        self.assertEqual(
            result.scene_id,
            1,
        )

        self.assertEqual(
            tuple(
                result
                .candidates_by_modality
                .keys()
            ),
            (
                "visual",
                "ocr",
            ),
        )

        self.assertEqual(
            len(
                result
                .candidates_by_modality[
                    "visual"
                ]
            ),
            3,
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

    async def test_preserves_scene_order(
        self,
    ) -> None:
        requests = [
            SceneRetrievalRequest(
                scene_id=10,
                top_k=2,
                queries=(
                    ModalityQuery(
                        modality="visual",
                        text="first scene",
                    ),
                ),
            ),
            SceneRetrievalRequest(
                scene_id=20,
                top_k=2,
                queries=(
                    ModalityQuery(
                        modality="asr",
                        text="second scene",
                    ),
                ),
            ),
        ]

        results = await self.orchestrator.search(
            requests
        )

        self.assertEqual(
            [
                result.scene_id
                for result in results
            ],
            [
                10,
                20,
            ],
        )

    async def test_empty_queries_return_no_results(
        self,
    ) -> None:
        request = SceneRetrievalRequest(
            scene_id=1,
            top_k=5,
            queries=(
                ModalityQuery(
                    modality="visual",
                    text="   ",
                ),
                ModalityQuery(
                    modality="ocr",
                    text="",
                ),
            ),
        )

        result = await (
            self.orchestrator.search_scene(
                request
            )
        )

        self.assertEqual(
            result.candidates_by_modality,
            {},
        )

    async def test_zero_top_k_returns_no_results(
        self,
    ) -> None:
        request = SceneRetrievalRequest(
            scene_id=1,
            top_k=0,
            queries=(
                ModalityQuery(
                    modality="visual",
                    text="test",
                ),
            ),
        )

        result = await (
            self.orchestrator.search_scene(
                request
            )
        )

        self.assertEqual(
            result.candidates_by_modality,
            {},
        )

    async def test_missing_adapter_raises_error(
        self,
    ) -> None:
        empty_registry = AdapterRegistry()

        orchestrator = SearchOrchestrator(
            empty_registry
        )

        request = SceneRetrievalRequest(
            scene_id=1,
            top_k=3,
            queries=(
                ModalityQuery(
                    modality="visual",
                    text="test",
                ),
            ),
        )

        with self.assertRaises(
            AdapterNotRegisteredError
        ):
            await orchestrator.search_scene(
                request
            )

    async def test_duplicate_modality_raises_error(
        self,
    ) -> None:
        request = SceneRetrievalRequest(
            scene_id=1,
            top_k=3,
            queries=(
                ModalityQuery(
                    modality="visual",
                    text="first visual query",
                ),
                ModalityQuery(
                    modality="visual",
                    text="second visual query",
                ),
            ),
        )

        with self.assertRaises(
            ValueError
        ):
            await self.orchestrator.search_scene(
                request
            )


if __name__ == "__main__":
    unittest.main()