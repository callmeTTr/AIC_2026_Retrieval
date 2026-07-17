import unittest

from app.retrieval.fusion import (
    FusedCandidate,
)
from app.retrieval.temporal import (
    NoOpTemporalReranker,
    TemporalRerankContext,
)


def create_fused_candidate(
    *,
    video_id: str,
    frame_index: int,
    scene_id: int,
    fusion_score: float,
) -> FusedCandidate:
    return FusedCandidate(
        video_id=video_id,
        frame_index=frame_index,
        timestamp_seconds=(
            frame_index / 30
        ),
        scene_id=scene_id,
        fusion_score=fusion_score,
        modality_scores={
            "visual": 0.9,
        },
        modality_ranks={
            "visual": 1,
        },
    )


class NoOpTemporalRerankerTests(
    unittest.TestCase
):
    def test_preserves_candidate_order(
        self,
    ) -> None:
        candidates = [
            create_fused_candidate(
                video_id="video_001",
                frame_index=30,
                scene_id=1,
                fusion_score=0.05,
            ),
            create_fused_candidate(
                video_id="video_002",
                frame_index=60,
                scene_id=2,
                fusion_score=0.04,
            ),
        ]

        context = TemporalRerankContext(
            scene_ids=(1, 2),
            window_seconds=5.0,
        )

        reranker = NoOpTemporalReranker()

        results = reranker.rerank(
            candidates,
            context,
        )

        self.assertEqual(
            results,
            candidates,
        )

        self.assertIsNot(
            results,
            candidates,
        )

    def test_empty_candidates_return_empty_list(
        self,
    ) -> None:
        context = TemporalRerankContext(
            scene_ids=(1,),
        )

        results = (
            NoOpTemporalReranker()
            .rerank(
                [],
                context,
            )
        )

        self.assertEqual(
            results,
            [],
        )

    def test_negative_window_raises_error(
        self,
    ) -> None:
        with self.assertRaises(
            ValueError
        ):
            TemporalRerankContext(
                scene_ids=(1,),
                window_seconds=-1.0,
            )


if __name__ == "__main__":
    unittest.main()