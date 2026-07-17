from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Sequence

from app.retrieval.fusion import (
    FusedCandidate,
)


@dataclass(frozen=True, slots=True)
class TemporalRerankContext:
    """
    Information available to a temporal reranker.

    The placeholder only stores this context. A future real
    implementation can use scene order, time windows and
    neighboring frames to adjust rankings.
    """

    scene_ids: tuple[int, ...]
    window_seconds: float = 5.0

    def __post_init__(self) -> None:
        if self.window_seconds < 0:
            raise ValueError(
                "window_seconds cannot be negative."
            )


class TemporalReranker(ABC):
    """Contract implemented by temporal ranking modules."""

    @abstractmethod
    def rerank(
        self,
        candidates: Sequence[
            FusedCandidate
        ],
        context: TemporalRerankContext,
    ) -> list[FusedCandidate]:
        """Return candidates in temporal-aware order."""


class NoOpTemporalReranker(
    TemporalReranker
):
    """
    Placeholder temporal module.

    It deliberately preserves the RRF order until the real
    temporal model or rule-based implementation is available.
    """

    def rerank(
        self,
        candidates: Sequence[
            FusedCandidate
        ],
        context: TemporalRerankContext,
    ) -> list[FusedCandidate]:
        del context

        return list(candidates)


temporal_reranker = NoOpTemporalReranker()