from hashlib import sha256

from app.retrieval.contracts import (
    RetrievalAdapter,
    RetrievalCandidate,
    RetrievalModality,
    RetrievalQuery,
)


SHARED_CANDIDATE_INTERVAL = 4
MOCK_FAILURE_QUERY_PREFIX = "__fail_"
MOCK_FAILURE_QUERY_SUFFIX = "__"
MOCK_VIDEO_FPS = 30
MOCK_TIMESTAMP_START_SECONDS = 1.0
MOCK_TIMESTAMP_STEP_SECONDS = 0.25
MOCK_TIMESTAMP_BUCKETS = 12


class MockRetrievalAdapter(RetrievalAdapter):
    """
    Deterministic adapter used before real retrieval modules exist.

    Every fourth candidate is shared across modalities in the
    same scene. Other candidates remain modality-specific.
    This allows the RRF layer to demonstrate score boosting.
    """

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

        if self._should_simulate_failure(
            normalized_text
        ):
            raise RuntimeError(
                "Simulated mock adapter failure."
            )

        query_seed = self._create_query_seed(
            text=normalized_text,
            scene_id=query.scene_id,
        )

        candidates: list[
            RetrievalCandidate
        ] = []

        for position in range(query.top_k):
            rank = position + 1
            candidate_index = position + 1

            is_shared = (
                position
                % SHARED_CANDIDATE_INTERVAL
                == 0
            )

            if is_shared:
                identity_seed = (
                    self._create_shared_seed(
                        scene_id=query.scene_id,
                        candidate_index=(
                            candidate_index
                        ),
                    )
                )
            else:
                identity_seed = (
                    query_seed + position
                )

            timestamp_seconds = round(
                MOCK_TIMESTAMP_START_SECONDS
                + (
                    identity_seed
                    % MOCK_TIMESTAMP_BUCKETS
                )
                * MOCK_TIMESTAMP_STEP_SECONDS,
                3,
            )

            frame_index = round(
                timestamp_seconds
                * MOCK_VIDEO_FPS
            )

            candidates.append(
                RetrievalCandidate(
                    video_id=self._build_video_id(
                        scene_id=query.scene_id,
                        candidate_index=(
                            candidate_index
                        ),
                        is_shared=is_shared,
                    ),
                    frame_index=frame_index,
                    timestamp_seconds=(
                        timestamp_seconds
                    ),
                    raw_score=round(
                        max(
                            0.01,
                            1.0
                            - position * 0.007,
                        ),
                        4,
                    ),
                    rank=rank,
                    modality=self.modality,
                    scene_id=query.scene_id,
                )
            )

        return candidates
    def _should_simulate_failure(
        self,
        normalized_text: str,
    ) -> bool:
        expected_query = (
            f"{MOCK_FAILURE_QUERY_PREFIX}"
            f"{self.modality}"
            f"{MOCK_FAILURE_QUERY_SUFFIX}"
        )

        return (
            normalized_text.lower()
            == expected_query
        )
    def _build_video_id(
        self,
        *,
        scene_id: int,
        candidate_index: int,
        is_shared: bool,
    ) -> str:
        if is_shared:
            return (
                f"shared_video_s{scene_id:02d}_"
                f"{candidate_index:04d}"
            )

        return (
            f"{self.modality}_video_s"
            f"{scene_id:02d}_"
            f"{candidate_index:04d}"
        )

    def _create_query_seed(
        self,
        *,
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

    @staticmethod
    def _create_shared_seed(
        *,
        scene_id: int,
        candidate_index: int,
    ) -> int:
        source = (
            f"shared:"
            f"{scene_id}:"
            f"{candidate_index}"
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