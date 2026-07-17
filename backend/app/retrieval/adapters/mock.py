from hashlib import sha256

from app.retrieval.contracts import (
    RetrievalAdapter,
    RetrievalCandidate,
    RetrievalModality,
    RetrievalQuery,
)


class MockRetrievalAdapter(RetrievalAdapter):
    """Deterministic adapter used before real retrieval modules exist."""

    def __init__(
        self,
        modality: RetrievalModality,
    ) -> None:
        self._modality = modality

    @property
    def modality(self) -> RetrievalModality:
        return self._modality

    async def search(
        self,
        query: RetrievalQuery,
    ) -> list[RetrievalCandidate]:
        normalized_text = query.text.strip()

        if not normalized_text or query.top_k <= 0:
            return []

        seed = self._create_seed(
            text=normalized_text,
            scene_id=query.scene_id,
        )

        candidates: list[RetrievalCandidate] = []

        for position in range(query.top_k):
            rank = position + 1
            numeric_seed = seed + position

            candidates.append(
                RetrievalCandidate(
                    video_id=(
                        f"{self.modality}_video_"
                        f"{numeric_seed % 12 + 1:03d}"
                    ),
                    frame_index=(
                        numeric_seed % 900
                    ),
                    timestamp_seconds=round(
                        1.25 + (numeric_seed % 240) * 0.5,
                        2,
                    ),
                    raw_score=round(
                        max(
                            0.01,
                            1.0 - position * 0.07,
                        ),
                        4,
                    ),
                    rank=rank,
                    modality=self.modality,
                    scene_id=query.scene_id,
                )
            )

        return candidates

    def _create_seed(
        self,
        text: str,
        scene_id: int,
    ) -> int:
        source = (
            f"{self.modality}:"
            f"{scene_id}:"
            f"{text}"
        )

        digest = sha256(
            source.encode("utf-8")
        ).hexdigest()

        return int(digest[:8], 16)


class VisualRetrievalAdapter(
    MockRetrievalAdapter
):
    def __init__(self) -> None:
        super().__init__("visual")


class OcrRetrievalAdapter(
    MockRetrievalAdapter
):
    def __init__(self) -> None:
        super().__init__("ocr")


class AsrRetrievalAdapter(
    MockRetrievalAdapter
):
    def __init__(self) -> None:
        super().__init__("asr")