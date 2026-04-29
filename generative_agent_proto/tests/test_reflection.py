from __future__ import annotations

from datetime import datetime, timezone
from tempfile import TemporaryDirectory
import unittest

from generative_agents.memory import MemoryManager
from generative_agents.models import AgentProfile, MemoryType, ReflectionStatus
from generative_agents.reflection import ReflectionEngine


class ReflectionTests(unittest.TestCase):
    def test_reflection_is_grounded_and_persisted(self) -> None:
        with TemporaryDirectory() as tmp:
            profile = AgentProfile(
                agent_id="agent_a",
                name="Aya",
                goals=["repair shared infrastructure"],
            )
            memory = MemoryManager("agent_a", data_dir=tmp)
            created_at = datetime(2026, 4, 29, 9, 0, tzinfo=timezone.utc)
            observation = memory.store(
                MemoryType.OBSERVATION,
                "Observed low pressure in the water pump.",
                importance=0.8,
                created_at=created_at,
            )
            engine = ReflectionEngine(importance_threshold=0.5)

            reflections = engine.reflect(profile, memory, now=created_at)

            self.assertEqual(len(reflections), 1)
            reflection = reflections[0]
            self.assertEqual(reflection.memory_type, MemoryType.REFLECTION)
            self.assertEqual(reflection.status, ReflectionStatus.ACTIVE)
            self.assertIn(observation.id, reflection.supporting_memory_ids)
            self.assertIsNotNone(memory.long_term.get(reflection.id))


if __name__ == "__main__":
    unittest.main()
