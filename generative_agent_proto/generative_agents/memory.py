"""Memory tiers and explicit memory-management operations."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

from .models import MemoryRecord, MemoryType, ReflectionStatus, make_id, utc_now
from .retrieval import RetrievalResult, RetrievalWeights, retrieve_top_k


class WorkingMemory:
    """Small active context for the current task."""

    def __init__(self, agent_id: str, capacity: int = 12) -> None:
        self.agent_id = agent_id
        self.capacity = capacity
        self._records: list[MemoryRecord] = []

    def add(self, memory: MemoryRecord) -> None:
        self._records = [record for record in self._records if record.id != memory.id]
        self._records.append(memory)
        if len(self._records) > self.capacity:
            self._records = self._records[-self.capacity :]

    def list_all(self) -> list[MemoryRecord]:
        return list(self._records)

    def clear(self) -> None:
        self._records.clear()

    def summarize(self) -> str:
        if not self._records:
            return "Working memory is empty."
        snippets = [f"- [{record.memory_type.value}] {record.content}" for record in self._records[-5:]]
        return "\n".join(snippets)


class LongTermMemory:
    """Persistent searchable memory backed by local JSONL."""

    def __init__(self, agent_id: str, data_dir: str | Path = "data") -> None:
        self.agent_id = agent_id
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.file_path = self.data_dir / f"{agent_id}_memories.jsonl"
        self._records: dict[str, MemoryRecord] = {}
        self._load()

    def _load(self) -> None:
        if not self.file_path.exists():
            return
        for line in self.file_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            record = MemoryRecord.from_dict(json.loads(line))
            self._records[record.id] = record

    def _persist(self) -> None:
        ordered = sorted(self._records.values(), key=lambda record: record.created_at)
        with self.file_path.open("w", encoding="utf-8") as handle:
            for record in ordered:
                handle.write(json.dumps(record.to_dict(), ensure_ascii=True, sort_keys=True))
                handle.write("\n")

    def store(self, memory: MemoryRecord) -> MemoryRecord:
        self._records[memory.id] = memory
        self._persist()
        return memory

    def get(self, memory_id: str) -> MemoryRecord | None:
        return self._records.get(memory_id)

    def list_all(self, memory_types: Iterable[MemoryType] | None = None) -> list[MemoryRecord]:
        records = list(self._records.values())
        if memory_types is not None:
            allowed = set(memory_types)
            records = [record for record in records if record.memory_type in allowed]
        return sorted(records, key=lambda record: record.created_at)

    def recent(self, limit: int = 10, memory_types: Iterable[MemoryType] | None = None) -> list[MemoryRecord]:
        return self.list_all(memory_types=memory_types)[-limit:]

    def retrieve(
        self,
        query: str,
        *,
        top_k: int = 5,
        memory_types: Iterable[MemoryType] | None = None,
        weights: RetrievalWeights | None = None,
    ) -> list[RetrievalResult]:
        records = self.list_all(memory_types=memory_types)
        results = retrieve_top_k(records, query, top_k=top_k, weights=weights)
        for result in results:
            result.record.mark_accessed()
            self._records[result.record.id] = result.record
        if results:
            self._persist()
        return results

    def update(self, memory_id: str, **changes: Any) -> MemoryRecord:
        record = self._records[memory_id]
        for key, value in changes.items():
            if not hasattr(record, key):
                raise AttributeError(f"MemoryRecord has no field '{key}'")
            setattr(record, key, value)
        self._persist()
        return record

    def discard(self, memory_id: str) -> bool:
        removed = self._records.pop(memory_id, None)
        if removed is not None:
            self._persist()
            return True
        return False

    def summarize(self, *, limit: int = 8) -> str:
        records = self.recent(limit=limit)
        if not records:
            return "Long-term memory is empty."
        return "\n".join(f"- {record.created_at.date()} [{record.memory_type.value}] {record.content}" for record in records)


class ArchivalMemory:
    """Stub for old events, large documents, and rarely used knowledge.

    The v0 implementation only stores lightweight document summaries in
    memory. A production version could page from local files, SQLite, a vector
    store, or an encrypted personal-memory archive.
    """

    def __init__(self) -> None:
        self._summaries: dict[str, str] = {}

    def store_summary(self, document_id: str, summary: str) -> None:
        self._summaries[document_id] = summary

    def retrieve_summary(self, document_id: str) -> str | None:
        return self._summaries.get(document_id)

    def retrieve(self, query: str, *, top_k: int = 3) -> list[str]:
        query_tokens = set(query.lower().split())
        scored = []
        for document_id, summary in self._summaries.items():
            score = len(query_tokens.intersection(summary.lower().split()))
            scored.append((score, document_id, summary))
        scored.sort(reverse=True)
        return [summary for score, _document_id, summary in scored[:top_k] if score > 0]


class MemoryManager:
    """MemGPT-style explicit operations over memory tiers."""

    def __init__(self, agent_id: str, data_dir: str | Path = "data", working_capacity: int = 12) -> None:
        self.agent_id = agent_id
        self.working = WorkingMemory(agent_id, capacity=working_capacity)
        self.long_term = LongTermMemory(agent_id, data_dir=data_dir)
        self.archival = ArchivalMemory()

    def store(
        self,
        memory_type: MemoryType,
        content: str,
        *,
        importance: float = 0.5,
        metadata: dict[str, Any] | None = None,
        confidence: float | None = None,
        supporting_memory_ids: list[str] | None = None,
        review_at=None,
        status: ReflectionStatus | None = None,
        to_working: bool = True,
        memory_id: str | None = None,
        created_at=None,
    ) -> MemoryRecord:
        if memory_type == MemoryType.REFLECTION and not supporting_memory_ids:
            raise ValueError("Reflections must include at least one supporting memory ID.")
        record = MemoryRecord(
            id=memory_id or make_id(memory_type.value[:3]),
            agent_id=self.agent_id,
            memory_type=memory_type,
            content=content,
            created_at=created_at or utc_now(),
            importance=max(0.0, min(1.0, importance)),
            metadata=metadata or {},
            confidence=confidence,
            supporting_memory_ids=supporting_memory_ids or [],
            review_at=review_at,
            status=status,
        )
        self.long_term.store(record)
        if to_working:
            self.working.add(record)
        return record

    def retrieve(
        self,
        query: str,
        *,
        top_k: int = 5,
        memory_types: Iterable[MemoryType] | None = None,
        weights: RetrievalWeights | None = None,
    ) -> list[RetrievalResult]:
        return self.long_term.retrieve(query, top_k=top_k, memory_types=memory_types, weights=weights)

    def update(self, memory_id: str, **changes: Any) -> MemoryRecord:
        updated = self.long_term.update(memory_id, **changes)
        self.working.add(updated)
        return updated

    def summarize(self) -> str:
        return "Working memory:\n" + self.working.summarize() + "\n\nLong-term memory:\n" + self.long_term.summarize()

    def discard(self, memory_id: str) -> bool:
        self.working._records = [record for record in self.working.list_all() if record.id != memory_id]
        return self.long_term.discard(memory_id)

    def page_to_long_term(self, memory: MemoryRecord) -> MemoryRecord:
        """Persist a working-memory record into long-term memory."""

        return self.long_term.store(memory)

    def page_to_working_memory(self, memory_id: str) -> MemoryRecord | None:
        """Load a long-term memory into active working memory."""

        record = self.long_term.get(memory_id)
        if record is not None:
            self.working.add(record)
        return record
