from app.retrieval.contracts import (
    RetrievalAdapter,
    RetrievalModality,
)


class AdapterAlreadyRegisteredError(
    RuntimeError
):
    """Raised when a modality is registered twice."""


class AdapterNotRegisteredError(
    LookupError
):
    """Raised when a requested adapter is unavailable."""


class AdapterRegistry:
    """Stores retrieval adapters by modality."""

    def __init__(self) -> None:
        self._adapters: dict[
            RetrievalModality,
            RetrievalAdapter,
        ] = {}

    def register(
        self,
        adapter: RetrievalAdapter,
    ) -> None:
        modality = adapter.modality

        if modality in self._adapters:
            raise AdapterAlreadyRegisteredError(
                "A retrieval adapter is already "
                f"registered for '{modality}'."
            )

        self._adapters[modality] = adapter

    def get(
        self,
        modality: RetrievalModality,
    ) -> RetrievalAdapter:
        try:
            return self._adapters[modality]
        except KeyError as error:
            raise AdapterNotRegisteredError(
                "No retrieval adapter is "
                f"registered for '{modality}'."
            ) from error

    def has(
        self,
        modality: RetrievalModality,
    ) -> bool:
        return modality in self._adapters

    def modalities(
        self,
    ) -> tuple[RetrievalModality, ...]:
        return tuple(self._adapters.keys())


adapter_registry = AdapterRegistry()