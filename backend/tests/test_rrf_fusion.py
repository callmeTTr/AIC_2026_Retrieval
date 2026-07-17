import unittest

from app.retrieval.contracts import (
    RetrievalCandidate,
    RetrievalModality,
)
from app.retrieval.fusion import (
    ReciprocalRankFusion,
)
from app.retrieval.orchestrator import (
    SceneRetrievalResult,
)


def create_candidate(
    *,
    video_id: str,
    frame_index: int,
    rank: int,
    modality: RetrievalModality,
    raw_score: float = 0.9,
    scene_id: int = 1,
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
        scene_id=scene_id,
    )


class ReciprocalRankFusionTests(
    unittest.TestCase
):
    def test_combines_same_candidate_across_modalities(
        self,
    ) -> None:
        scene_result = SceneRetrievalResult(
            scene_id=1,
            candidates_by_modality={
                "visual": (
                    create_candidate(
                        video_id="video_001",
                        frame_index=30,
                        rank=1,
                        modality="visual",
                    ),
                ),
                "ocr": (
                    create_candidate(
                        video_id="video_001",
                        frame_index=30,
                        rank=2,
                        modality="ocr",
                    ),
                ),
            },
        )

        fusion = ReciprocalRankFusion(
            rank_constant=60
        )

        results = fusion.fuse_scene(
            scene_result
        )

        self.assertEqual(
            len(results),
            1,
        )

        fused_candidate = results[0]

        self.assertEqual(
            fused_candidate.video_id,
            "video_001",
        )

        self.assertEqual(
            fused_candidate.modality_ranks,
            {
                "visual": 1,
                "ocr": 2,
            },
        )

        self.assertAlmostEqual(
            fused_candidate.fusion_score,
            (
                1 / 61
                + 1 / 62
            ),
            places=7,
        )

    def test_multi_modality_candidate_ranks_first(
        self,
    ) -> None:
        scene_result = SceneRetrievalResult(
            scene_id=1,
            candidates_by_modality={
                "visual": (
                    create_candidate(
                        video_id="shared",
                        frame_index=30,
                        rank=2,
                        modality="visual",
                    ),
                    create_candidate(
                        video_id="visual_only",
                        frame_index=60,
                        rank=1,
                        modality="visual",
                    ),
                ),
                "ocr": (
                    create_candidate(
                        video_id="shared",
                        frame_index=30,
                        rank=1,
                        modality="ocr",
                    ),
                ),
            },
        )

        results = (
            ReciprocalRankFusion()
            .fuse_scene(scene_result)
        )

        self.assertEqual(
            results[0].video_id,
            "shared",
        )

        self.assertGreater(
            results[0].fusion_score,
            results[1].fusion_score,
        )

    def test_modality_weights_affect_ranking(
        self,
    ) -> None:
        scene_result = SceneRetrievalResult(
            scene_id=1,
            candidates_by_modality={
                "visual": (
                    create_candidate(
                        video_id="visual_result",
                        frame_index=30,
                        rank=1,
                        modality="visual",
                    ),
                ),
                "ocr": (
                    create_candidate(
                        video_id="ocr_result",
                        frame_index=60,
                        rank=1,
                        modality="ocr",
                    ),
                ),
            },
        )

        fusion = ReciprocalRankFusion(
            modality_weights={
                "visual": 2.0,
                "ocr": 1.0,
                "asr": 1.0,
            }
        )

        results = fusion.fuse_scene(
            scene_result
        )

        self.assertEqual(
            results[0].video_id,
            "visual_result",
        )

    def test_duplicate_inside_one_list_is_ignored(
        self,
    ) -> None:
        duplicate = create_candidate(
            video_id="video_001",
            frame_index=30,
            rank=1,
            modality="visual",
        )

        scene_result = SceneRetrievalResult(
            scene_id=1,
            candidates_by_modality={
                "visual": (
                    duplicate,
                    duplicate,
                ),
            },
        )

        results = (
            ReciprocalRankFusion()
            .fuse_scene(scene_result)
        )

        self.assertEqual(
            len(results),
            1,
        )

        self.assertAlmostEqual(
            results[0].fusion_score,
            1 / 61,
            places=7,
        )

    def test_invalid_configuration_raises_error(
        self,
    ) -> None:
        with self.assertRaises(
            ValueError
        ):
            ReciprocalRankFusion(
                rank_constant=0
            )

        with self.assertRaises(
            ValueError
        ):
            ReciprocalRankFusion(
                modality_weights={
                    "visual": -1.0,
                    "ocr": 1.0,
                    "asr": 1.0,
                }
            )


if __name__ == "__main__":
    unittest.main()