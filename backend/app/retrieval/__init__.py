from app.retrieval.bootstrap import (
    register_default_adapters,
)
from app.retrieval.registry import (
    AdapterRegistry,
    adapter_registry,
)

__all__ = [
    "AdapterRegistry",
    "adapter_registry",
    "register_default_adapters",
]