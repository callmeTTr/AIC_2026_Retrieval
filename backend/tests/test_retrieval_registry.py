import unittest

from app.retrieval.adapters import (
    VisualRetrievalAdapter,
)
from app.retrieval.bootstrap import (
    register_default_adapters,
)
from app.retrieval.registry import (
    AdapterAlreadyRegisteredError,
    AdapterRegistry,
)


class AdapterRegistryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = AdapterRegistry()

    def test_registers_all_default_adapters(
        self,
    ) -> None:
        register_default_adapters(
            self.registry
        )

        self.assertEqual(
            self.registry.modalities(),
            (
                "visual",
                "ocr",
                "asr",
            ),
        )

    def test_default_registration_is_idempotent(
        self,
    ) -> None:
        register_default_adapters(
            self.registry
        )
        register_default_adapters(
            self.registry
        )

        self.assertEqual(
            len(
                self.registry.modalities()
            ),
            3,
        )

    def test_get_returns_requested_adapter(
        self,
    ) -> None:
        register_default_adapters(
            self.registry
        )

        adapter = self.registry.get(
            "visual"
        )

        self.assertEqual(
            adapter.modality,
            "visual",
        )

    def test_duplicate_registration_raises(
        self,
    ) -> None:
        self.registry.register(
            VisualRetrievalAdapter()
        )

        with self.assertRaises(
            AdapterAlreadyRegisteredError
        ):
            self.registry.register(
                VisualRetrievalAdapter()
            )


if __name__ == "__main__":
    unittest.main()