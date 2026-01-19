"""Episodic memory storage and retrieval."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

from agent.db import fetch_all

_TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")


def _tokenize(text: str) -> set[str]:
    return {token.lower() for token in _TOKEN_RE.findall(text)}


def _token_overlap(a: Iterable[str], b: Iterable[str]) -> float:
    set_a = set(a)
    set_b = set(b)
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


@dataclass
class EpisodeSummary:
    id: int
    timestamp: str
    task: str
    summary: str
    similarity: float


class EpisodicMemory:
    """Hierarchical episodic memory backed by SQLite."""

    def __init__(self, conn):
        self.conn = conn

    def save_episode(
        self,
        *,
        user_context: str,
        task: str,
        plan: str,
        thought_trace: str,
        outcome: str,
        reward_signals: dict,
        episode_summary: str,
        episode_detail: str,
        timestamp: str | None = None,
    ) -> int:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO episodes (
                timestamp, user_context, task, plan, thought_trace, outcome,
                reward_signals, episode_summary, episode_detail
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timestamp or datetime.utcnow().isoformat(),
                user_context,
                task,
                plan,
                thought_trace,
                outcome,
                json.dumps(reward_signals),
                episode_summary,
                episode_detail,
            ),
        )
        self.conn.commit()
        return int(cursor.lastrowid)

    def retrieve_similar(self, task: str, user_context: str, k: int = 5) -> list[EpisodeSummary]:
        query_tokens = _tokenize(f"{task} {user_context}")
        episodes = fetch_all(
            self.conn,
            "SELECT id, timestamp, task, episode_summary, user_context FROM episodes",
        )
        scored: list[EpisodeSummary] = []
        for row in episodes:
            tokens = _tokenize(f"{row['task']} {row['user_context']}")
            similarity = _token_overlap(query_tokens, tokens)
            scored.append(
                EpisodeSummary(
                    id=row["id"],
                    timestamp=row["timestamp"],
                    task=row["task"],
                    summary=row["episode_summary"],
                    similarity=similarity,
                )
            )
        scored.sort(key=lambda item: item.similarity, reverse=True)
        return scored[:k]

    def get_episode_detail(self, episode_id: int) -> str | None:
        row = fetch_all(
            self.conn,
            "SELECT episode_detail FROM episodes WHERE id = ?",
            (episode_id,),
        )
        if not row:
            return None
        return row[0]["episode_detail"]
