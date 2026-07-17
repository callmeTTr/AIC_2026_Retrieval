from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal


RetrievalModality = Literal[
    "visual",
    "ocr",
    "asr",
]


@dataclass(frozen=True, slots=True)
class RetrievalQuery:
    """Input passed to one retrieval adapter."""

    text: str
    top_k: int
    scene_id: int


@dataclass(frozen=True, slots=True)
class RetrievalCandidate:
    """Normalized result returned by a retrieval adapter."""

    video_id: str
    frame_index: int
    timestamp_seconds: float
    raw_score: float
    rank: int
    modality: RetrievalModality
    scene_id: int


class RetrievalAdapter(ABC):
    """
    Common interface for Visual, OCR and ASR retrieval modules.

    Every real or mock retrieval module must implement this
    contract so the search orchestration layer can use them
    without knowing their internal implementation.
    """

    @property
    @abstractmethod
    def modality(self) -> RetrievalModality:
        """Return the modality handled by this adapter."""

    @abstractmethod
    async def search(
        self,
        query: RetrievalQuery,
    ) -> list[RetrievalCandidate]:
        """Return ranked retrieval candidates."""