from __future__ import annotations

from tempfile import TemporaryDirectory
import unittest

from generative_agents.memory import MemoryManager
from generative_agents.models import MemoryType


class MemoryTests(unittest.TestCase):
    def test_store_reload_update_and_discard_memory(self) -> None:
        with TemporaryDirectory() as tmp:
            memory = MemoryManager("agent_a", data_dir=tmp)
            record = memory.store(
                MemoryType.OBSERVATION,
                "Observed a broken pump near the workshop.",
                importance=0.8,
            )

            reloaded = MemoryManager("agent_a", data_dir=tmp)
            self.assertIsNotNone(reloaded.long_term.get(record.id))

            updated = reloaded.update(record.id, importance=0.9)
            self.assertEqual(updated.importance, 0.9)

            self.assertTrue(reloaded.discard(record.id))
            self.assertIsNone(reloaded.long_term.get(record.id))

    def test_reflection_requires_supporting_memory_ids(self) -> None:
        with TemporaryDirectory() as tmp:
            memory = MemoryManager("agent_a", data_dir=tmp)
            with self.assertRaises(ValueError):
                memory.store(
                    MemoryType.REFLECTION,
                    "Unsupported reflection should not be stored.",
                    importance=0.7,
                )


if __name__ == "__main__":
    unittest.main()
