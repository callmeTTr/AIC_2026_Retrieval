from app.retrieval.adapters.mock import (
    AsrRetrievalAdapter,
    OcrRetrievalAdapter,
    VisualRetrievalAdapter,
)
from app.retrieval.registry import (
    AdapterRegistry,
    adapter_registry,
)


def register_default_adapters(
    registry: AdapterRegistry = adapter_registry,
) -> AdapterRegistry:
    """
    Register the default retrieval adapters.

    The checks make this function safe to call more than once
    during development and application reloads.
    """

    adapters = (
        VisualRetrievalAdapter(),
        OcrRetrievalAdapter(),
        AsrRetrievalAdapter(),
    )

    for adapter in adapters:
        if not registry.has(adapter.modality):
            registry.register(adapter)

    return registry