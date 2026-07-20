import unittest

from pydantic import ValidationError

from app.schemas.refinement import (
    RefinementReferenceResult,
    RefinementRequest,
)
from app.schemas.search import (
    ModalityScores,
    QuerySceneRequest,
    SearchOptions,
    SearchResponse,
    SearchResult,
)
from app.services.refinement_service import (
    RefinementService,
)


class StubBaseSearchService:
    def __init__(self) -> None:
        self.received_requests = []

    async def search(
        self,
        request,
    ) -> SearchResponse:
        self.received_requests.append(
            request
        )

        return SearchResponse(
            search_id="base-search-id",
            task=request.task,
            processing_time_ms=1,
            total_results=3,
            warnings=[],
            results=[
                SearchResult(
                    rank=1,
                    video_id="other_video",
                    frame_index=10,
                    timestamp_seconds=1.0,
                    timestamp_display=(
                        "00:00:01.000"
                    ),
                    thumbnail_url=(
                        "https://example.com/"
                        "other-thumb.jpg"
                    ),
                    frame_url=(
                        "https://example.com/"
                        "other-frame.jpg"
                    ),
                    score=0.90,
                    matched_scene=1,
                    modality_scores=(
                        ModalityScores(
                            visual=0.90,
                        )
                    ),
                ),
                SearchResult(
                    rank=2,
                    video_id="reference_video",
                    frame_index=30,
                    timestamp_seconds=2.0,
                    timestamp_display=(
                        "00:00:02.000"
                    ),
                    thumbnail_url=(
                        "https://example.com/"
                        "reference-30-thumb.jpg"
                    ),
                    frame_url=(
                        "https://example.com/"
                        "reference-30-frame.jpg"
                    ),
                    score=0.80,
                    matched_scene=1,
                    modality_scores=(
                        ModalityScores(
                            visual=0.80,
                        )
                    ),
                ),
                SearchResult(
                    rank=3,
                    video_id="reference_video",
                    frame_index=60,
                    timestamp_seconds=3.0,
                    timestamp_display=(
                        "00:00:03.000"
                    ),
                    thumbnail_url=(
                        "https://example.com/"
                        "reference-60-thumb.jpg"
                    ),
                    frame_url=(
                        "https://example.com/"
                        "reference-60-frame.jpg"
                    ),
                    score=0.70,
                    matched_scene=1,
                    modality_scores=(
                        ModalityScores(
                            visual=0.70,
                        )
                    ),
                ),
            ],
        )


def create_refinement_request(
    feedback: str = (
        "Change the shirt color to blue"
    ),
) -> RefinementRequest:
    return RefinementRequest(
        task="task_1",
        parent_search_id=(
            "parent-search-id"
        ),
        refinement_iteration=1,
        reference_result=(
            RefinementReferenceResult(
                video_id="reference_video",
                frame_index=30,
                timestamp_seconds=2.0,
                thumbnail_url=(
                    "https://example.com/"
                    "reference-thumb.jpg"
                ),
                frame_url=(
                    "https://example.com/"
                    "reference-frame.jpg"
                ),
            )
        ),
        feedback=feedback,
        original_scenes=[
            QuerySceneRequest(
                scene_id=1,
                visual_query=(
                    "a football player"
                ),
                ocr_query="",
                asr_query="",
            )
        ],
        options=SearchOptions(
            top_k_per_modality=100,
            display_result_count=20,
        ),
    )


class RefinementServiceTests(
    unittest.IsolatedAsyncioTestCase
):
    async def test_refine_returns_expected_metadata(
        self,
    ) -> None:
        base_service = (
            StubBaseSearchService()
        )

        service = RefinementService(
            base_search_service=base_service,
        )

        response = await service.refine(
            create_refinement_request()
        )

        self.assertEqual(
            response.parent_search_id,
            "parent-search-id",
        )

        self.assertEqual(
            response.refinement_iteration,
            1,
        )

        self.assertEqual(
            response.task,
            "task_1",
        )

        self.assertEqual(
            response.total_results,
            3,
        )

        self.assertEqual(
            len(response.warnings),
            1,
        )

        warning = response.warnings[0]

        self.assertEqual(
            warning.module,
            "refinement.mock",
        )

        self.assertEqual(
            warning.code,
            "mock_refinement",
        )

    async def test_prioritizes_reference_video_and_reassigns_ranks(
        self,
    ) -> None:
        service = RefinementService(
            base_search_service=(
                StubBaseSearchService()
            ),
        )

        response = await service.refine(
            create_refinement_request()
        )

        self.assertEqual(
            [
                result.video_id
                for result
                in response.results[:2]
            ],
            [
                "reference_video",
                "reference_video",
            ],
        )

        self.assertEqual(
            [
                result.rank
                for result
                in response.results
            ],
            [
                1,
                2,
                3,
            ],
        )

    async def test_same_input_produces_same_result_order(
        self,
    ) -> None:
        service = RefinementService(
            base_search_service=(
                StubBaseSearchService()
            ),
        )

        request = (
            create_refinement_request()
        )

        first_response = (
            await service.refine(request)
        )

        second_response = (
            await service.refine(request)
        )

        first_order = [
            (
                result.video_id,
                result.frame_index,
            )
            for result
            in first_response.results
        ]

        second_order = [
            (
                result.video_id,
                result.frame_index,
            )
            for result
            in second_response.results
        ]

        self.assertEqual(
            first_order,
            second_order,
        )

    async def test_calls_base_search_without_general_feedback(
        self,
    ) -> None:
        base_service = (
            StubBaseSearchService()
        )

        service = RefinementService(
            base_search_service=base_service,
        )

        await service.refine(
            create_refinement_request()
        )

        self.assertEqual(
            len(
                base_service
                .received_requests
            ),
            1,
        )

        received_request = (
            base_service
            .received_requests[0]
        )

        self.assertEqual(
            received_request.feedback,
            "",
        )

        self.assertEqual(
            received_request.scenes[0]
            .visual_query,
            "a football player",
        )

    def test_blank_feedback_is_rejected(
        self,
    ) -> None:
        with self.assertRaises(
            ValidationError
        ):
            create_refinement_request(
                feedback="   "
            )


if __name__ == "__main__":
    unittest.main()