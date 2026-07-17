import asyncio
from dataclasses import dataclass
from typing import Sequence

from app.retrieval.contracts import (
    RetrievalAdapter,
    RetrievalCandidate,
    RetrievalModality,
    RetrievalQuery,
)
from app.retrieval.issues import (
    RetrievalIssue,
    create_adapter_failure_issue,
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
    """Raw adapter results and recoverable issues for one scene."""

    scene_id: int
    candidates_by_modality: dict[
        RetrievalModality,
        tuple[RetrievalCandidate, ...],
    ]
    issues: tuple[RetrievalIssue, ...] = ()


@dataclass(frozen=True, slots=True)
class _AdapterSearchOutcome:
    """Internal result of one adapter execution."""

    modality: RetrievalModality
    candidates: tuple[
        RetrievalCandidate,
        ...,
    ]
    issue: RetrievalIssue | None = None


class SearchOrchestrator:
    """
    Coordinate retrieval adapters.

    Each modality receives its own query. Adapter searches run
    concurrently. A runtime failure in one adapter is converted
    into a warning while healthy adapters keep their results.
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
                issues=(),
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
                self._search_adapter(
                    adapter=adapter,
                    query=retrieval_query,
                )
            )

        outcomes = await asyncio.gather(
            *search_tasks
        )

        candidates_by_modality: dict[
            RetrievalModality,
            tuple[RetrievalCandidate, ...],
        ] = {}

        issues: list[RetrievalIssue] = []

        for outcome in outcomes:
            if outcome.issue is not None:
                issues.append(outcome.issue)
                continue

            candidates_by_modality[
                outcome.modality
            ] = outcome.candidates

        return SceneRetrievalResult(
            scene_id=request.scene_id,
            candidates_by_modality=(
                candidates_by_modality
            ),
            issues=tuple(issues),
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

    async def _search_adapter(
        self,
        *,
        adapter: RetrievalAdapter,
        query: RetrievalQuery,
    ) -> _AdapterSearchOutcome:
        try:
            candidates = await adapter.search(
                query
            )
        except Exception as error:
            return _AdapterSearchOutcome(
                modality=adapter.modality,
                candidates=(),
                issue=create_adapter_failure_issue(
                    scene_id=query.scene_id,
                    modality=adapter.modality,
                    error=error,
                ),
            )

        return _AdapterSearchOutcome(
            modality=adapter.modality,
            candidates=tuple(candidates),
        )

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