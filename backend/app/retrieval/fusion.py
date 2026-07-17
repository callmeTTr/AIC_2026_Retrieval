from dataclasses import dataclass, field
from typing import Sequence

from app.retrieval.contracts import (
    RetrievalCandidate,
    RetrievalModality,
)
from app.retrieval.orchestrator import (
    SceneRetrievalResult,
)


CandidateKey = tuple[str, int]


@dataclass(slots=True)
class _FusionAccumulator:
    """Internal mutable state used while combining rankings."""

    candidate: RetrievalCandidate
    fusion_score: float = 0.0
    modality_scores: dict[
        RetrievalModality,
        float,
    ] = field(default_factory=dict)
    modality_ranks: dict[
        RetrievalModality,
        int,
    ] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class FusedCandidate:
    """One candidate after reciprocal rank fusion."""

    video_id: str
    frame_index: int
    timestamp_seconds: float
    scene_id: int
    fusion_score: float
    modality_scores: dict[
        RetrievalModality,
        float,
    ]
    modality_ranks: dict[
        RetrievalModality,
        int,
    ]


class ReciprocalRankFusion:
    """
    Combine ranked lists from Visual, OCR and ASR.

    Each occurrence contributes:

        modality_weight / (rank_constant + rank)

    A candidate appearing in several modalities receives the
    sum of all contributions.
    """

    def __init__(
        self,
        rank_constant: int = 60,
        modality_weights: dict[
            RetrievalModality,
            float,
        ] | None = None,
    ) -> None:
        if rank_constant < 1:
            raise ValueError(
                "rank_constant must be at least 1."
            )

        weights = modality_weights or {
            "visual": 1.0,
            "ocr": 1.0,
            "asr": 1.0,
        }

        for modality, weight in weights.items():
            if weight < 0:
                raise ValueError(
                    "Modality weights cannot be "
                    f"negative: '{modality}'."
                )

        self._rank_constant = rank_constant
        self._modality_weights = weights

    def fuse_scene(
        self,
        scene_result: SceneRetrievalResult,
    ) -> list[FusedCandidate]:
        accumulators: dict[
            CandidateKey,
            _FusionAccumulator,
        ] = {}

        for (
            modality,
            candidates,
        ) in scene_result.candidates_by_modality.items():
            self._add_ranked_list(
                accumulators=accumulators,
                modality=modality,
                candidates=candidates,
            )

        fused_candidates = [
            self._build_fused_candidate(
                accumulator
            )
            for accumulator in accumulators.values()
        ]

        fused_candidates.sort(
            key=self._sort_key
        )

        return fused_candidates

    def fuse(
        self,
        scene_results: Sequence[
            SceneRetrievalResult
        ],
    ) -> list[FusedCandidate]:
        fused_candidates = []

        for scene_result in scene_results:
            fused_candidates.extend(
                self.fuse_scene(scene_result)
            )

        fused_candidates.sort(
            key=self._sort_key
        )

        return fused_candidates

    def _add_ranked_list(
        self,
        accumulators: dict[
            CandidateKey,
            _FusionAccumulator,
        ],
        modality: RetrievalModality,
        candidates: Sequence[
            RetrievalCandidate
        ],
    ) -> None:
        weight = self._modality_weights.get(
            modality,
            1.0,
        )

        seen_candidates: set[
            CandidateKey
        ] = set()

        for fallback_rank, candidate in enumerate(
            candidates,
            start=1,
        ):
            candidate_key = (
                candidate.video_id,
                candidate.frame_index,
            )

            if candidate_key in seen_candidates:
                continue

            seen_candidates.add(candidate_key)

            rank = max(
                1,
                candidate.rank
                or fallback_rank,
            )

            accumulator = accumulators.get(
                candidate_key
            )

            if accumulator is None:
                accumulator = _FusionAccumulator(
                    candidate=candidate
                )

                accumulators[
                    candidate_key
                ] = accumulator

            accumulator.fusion_score += (
                weight
                / (
                    self._rank_constant
                    + rank
                )
            )

            accumulator.modality_scores[
                modality
            ] = candidate.raw_score

            accumulator.modality_ranks[
                modality
            ] = rank

    @staticmethod
    def _build_fused_candidate(
        accumulator: _FusionAccumulator,
    ) -> FusedCandidate:
        candidate = accumulator.candidate

        return FusedCandidate(
            video_id=candidate.video_id,
            frame_index=candidate.frame_index,
            timestamp_seconds=(
                candidate.timestamp_seconds
            ),
            scene_id=candidate.scene_id,
            fusion_score=round(
                accumulator.fusion_score,
                8,
            ),
            modality_scores=dict(
                accumulator.modality_scores
            ),
            modality_ranks=dict(
                accumulator.modality_ranks
            ),
        )

    @staticmethod
    def _sort_key(
        candidate: FusedCandidate,
    ) -> tuple[
        float,
        int,
        str,
        int,
    ]:
        return (
            -candidate.fusion_score,
            candidate.scene_id,
            candidate.video_id,
            candidate.frame_index,
        )


reciprocal_rank_fusion = (
    ReciprocalRankFusion()
)