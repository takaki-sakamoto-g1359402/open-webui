from __future__ import annotations

from datetime import datetime, timedelta, timezone
import unittest

from generative_agents.models import MemoryRecord, MemoryType
from generative_agents.retrieval import retrieve_top_k


class RetrievalTests(unittest.TestCase):
    def test_relevant_memory_ranks_first(self) -> None:
        now = datetime(2026, 4, 29, 12, 0, tzinfo=timezone.utc)
        relevant = MemoryRecord(
            id="mem_relevant",
            agent_id="agent_a",
            memory_type=MemoryType.OBSERVATION,
            content="The water pump needs maintenance and a gasket check.",
            created_at=now - timedelta(hours=1),
            importance=0.7,
        )
        irrelevant = MemoryRecord(
            id="mem_irrelevant",
            agent_id="agent_a",
            memory_type=MemoryType.OBSERVATION,
            content="The garden beds need sunlight tracking.",
            created_at=now,
            importance=0.9,
        )

        results = retrieve_top_k([irrelevant, relevant], "pump gasket maintenance", top_k=2, now=now)

        self.assertEqual(results[0].record.id, "mem_relevant")
        self.assertGreater(results[0].score.relevance, results[1].score.relevance)

    def test_score_breakdown_is_bounded(self) -> None:
        now = datetime(2026, 4, 29, 12, 0, tzinfo=timezone.utc)
        record = MemoryRecord(
            id="mem",
            agent_id="agent_a",
            memory_type=MemoryType.SEMANTIC,
            content="pump repair tools",
            created_at=now,
            importance=1.0,
        )
        result = retrieve_top_k([record], "pump tools", top_k=1, now=now)[0]
        self.assertGreaterEqual(result.score.final, 0.0)
        self.assertLessEqual(result.score.final, 1.0)


if __name__ == "__main__":
    unittest.main()
