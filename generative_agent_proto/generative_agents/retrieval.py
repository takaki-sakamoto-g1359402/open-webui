"""Deterministic local retrieval for memory records.

The toy embedding function is intentionally simple: normalized token
frequencies with cosine similarity. A production version can replace
``toy_embedding`` and ``cosine_similarity`` with a real embedding model or
vector database without changing the memory API.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import datetime
import math
import re

from .models import MemoryRecord, utc_now

TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+")


@dataclass(frozen=True)
class RetrievalWeights:
    """Weights for weighted memory retrieval."""

    recency: float = 0.25
    importance: float = 0.25
    relevance: float = 0.50


@dataclass(frozen=True)
class RetrievalScore:
    """Breakdown of a memory retrieval score."""

    recency: float
    importance: float
    relevance: float
    final: float


@dataclass(frozen=True)
class RetrievalResult:
    """A ranked memory result with score details."""

    record: MemoryRecord
    score: RetrievalScore


def tokenize(text: str) -> list[str]:
    """Lowercase tokenization for deterministic local demos."""

    return TOKEN_RE.findall(text.lower())


def toy_embedding(text: str) -> dict[str, float]:
    """Return a normalized token-frequency embedding.

    This is a clear plug-in point for a real embedding model later. v0 avoids
    external APIs and heavy local dependencies by design.
    """

    counts = Counter(tokenize(text))
    total = sum(counts.values()) or 1
    return {token: count / total for token, count in counts.items()}


def cosine_similarity(left: dict[str, float], right: dict[str, float]) -> float:
    """Compute cosine similarity over sparse dictionaries."""

    if not left or not right:
        return 0.0
    common = set(left).intersection(right)
    dot = sum(left[token] * right[token] for token in common)
    left_norm = math.sqrt(sum(value * value for value in left.values()))
    right_norm = math.sqrt(sum(value * value for value in right.values()))
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (left_norm * right_norm)))


def recency_score(created_at: datetime, *, now: datetime | None = None, half_life_hours: float = 24.0) -> float:
    """Score recent memories higher with a smooth decay."""

    now = now or utc_now()
    age_hours = max(0.0, (now - created_at).total_seconds() / 3600.0)
    return 1.0 / (1.0 + age_hours / half_life_hours)


def score_memory(
    memory: MemoryRecord,
    query: str,
    *,
    now: datetime | None = None,
    weights: RetrievalWeights | None = None,
) -> RetrievalScore:
    """Score one memory using recency, importance, and relevance."""

    weights = weights or RetrievalWeights()
    relevance = cosine_similarity(toy_embedding(query), toy_embedding(memory.content))
    recency = recency_score(memory.created_at, now=now)
    importance = max(0.0, min(1.0, memory.importance))
    final = (
        weights.recency * recency
        + weights.importance * importance
        + weights.relevance * relevance
    )
    return RetrievalScore(
        recency=recency,
        importance=importance,
        relevance=relevance,
        final=final,
    )


def retrieve_top_k(
    memories: list[MemoryRecord],
    query: str,
    *,
    top_k: int = 5,
    now: datetime | None = None,
    weights: RetrievalWeights | None = None,
) -> list[RetrievalResult]:
    """Return top-k memories sorted by weighted retrieval score."""

    ranked = [
        RetrievalResult(record=memory, score=score_memory(memory, query, now=now, weights=weights))
        for memory in memories
    ]
    ranked.sort(key=lambda result: (result.score.final, result.record.created_at), reverse=True)
    return ranked[:top_k]
