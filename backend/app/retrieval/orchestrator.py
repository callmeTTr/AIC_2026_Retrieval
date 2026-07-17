import asyncio
from dataclasses import dataclass
from typing import Sequence

from app.retrieval.contracts import (
    RetrievalCandidate,
    RetrievalModality,
    RetrievalQuery,
)
from app.retrieval.registry import (
    AdapterRegistry,
    adapter_registry,
)


@dataclass(frozen=True, slots=True)
class ModalityQuery:
    """One query assigned to one retrieval modality."""

    modality: RetrievalModality
    text: str


@dataclass(frozen=True, slots=True)
class SceneRetrievalRequest:
    """One scene containing independent modality queries."""

    scene_id: int
    top_k: int
    queries: tuple[ModalityQuery, ...]


@dataclass(frozen=True, slots=True)
class SceneRetrievalResult:
    """Raw adapter results grouped by modality."""

    scene_id: int
    candidates_by_modality: dict[
        RetrievalModality,
        tuple[RetrievalCandidate, ...],
    ]


class SearchOrchestrator:
    """
    Coordinate retrieval adapters.

    Each modality receives its own query text. Active
    adapters are resolved from the registry and executed
    concurrently.
    """

    def __init__(
        self,
        registry: AdapterRegistry = adapter_registry,
    ) -> None:
        self._registry = registry

    async def search_scene(
        self,
        request: SceneRetrievalRequest,
    ) -> SceneRetrievalResult:
        active_queries = self._prepare_queries(
            request.queries
        )

        if (
            request.top_k <= 0
            or not active_queries
        ):
            return SceneRetrievalResult(
                scene_id=request.scene_id,
                candidates_by_modality={},
            )

        search_tasks = []

        for modality_query in active_queries:
            adapter = self._registry.get(
                modality_query.modality
            )

            retrieval_query = RetrievalQuery(
                text=modality_query.text,
                top_k=request.top_k,
                scene_id=request.scene_id,
            )

            search_tasks.append(
                adapter.search(retrieval_query)
            )

        adapter_results = await asyncio.gather(
            *search_tasks
        )

        candidates_by_modality = {
            modality_query.modality: tuple(
                candidates
            )
            for modality_query, candidates in zip(
                active_queries,
                adapter_results,
                strict=True,
            )
        }

        return SceneRetrievalResult(
            scene_id=request.scene_id,
            candidates_by_modality=(
                candidates_by_modality
            ),
        )

    async def search(
        self,
        requests: Sequence[
            SceneRetrievalRequest
        ],
    ) -> list[SceneRetrievalResult]:
        if not requests:
            return []

        results = await asyncio.gather(
            *(
                self.search_scene(request)
                for request in requests
            )
        )

        return list(results)

    @staticmethod
    def _prepare_queries(
        queries: Sequence[ModalityQuery],
    ) -> list[ModalityQuery]:
        active_queries: list[
            ModalityQuery
        ] = []

        seen_modalities: set[
            RetrievalModality
        ] = set()

        for query in queries:
            normalized_text = query.text.strip()

            if not normalized_text:
                continue

            if query.modality in seen_modalities:
                raise ValueError(
                    "A scene cannot contain more "
                    "than one active query for "
                    f"modality '{query.modality}'."
                )

            seen_modalities.add(
                query.modality
            )

            active_queries.append(
                ModalityQuery(
                    modality=query.modality,
                    text=normalized_text,
                )
            )

        return active_queries


search_orchestrator = SearchOrchestrator()