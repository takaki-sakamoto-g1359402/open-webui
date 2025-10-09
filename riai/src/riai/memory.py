"""Persistence layer for Riai."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Iterable, List

from .utils.types import Observation, Plan, Skill


class MemoryStore:
    """Lightweight SQLite-backed memory store."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path)

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS episodes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    goal TEXT NOT NULL,
                    plan_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS steps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    episode_id INTEGER NOT NULL,
                    step_id TEXT NOT NULL,
                    success INTEGER NOT NULL,
                    output TEXT,
                    error TEXT,
                    FOREIGN KEY(episode_id) REFERENCES episodes(id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS skills (
                    name TEXT PRIMARY KEY,
                    description TEXT NOT NULL,
                    template_json TEXT NOT NULL,
                    success_count INTEGER NOT NULL
                )
                """
            )
            conn.commit()

    def persist_episode(self, plan: Plan, observations: List[Observation]) -> None:
        with self._connect() as conn:
            cursor = conn.execute(
                "INSERT INTO episodes(goal, plan_json, created_at) VALUES (?, ?, ?)",
                (plan.goal, plan.model_dump_json(), datetime.utcnow().isoformat()),
            )
            episode_id = cursor.lastrowid
            for obs in observations:
                conn.execute(
                    "INSERT INTO steps(episode_id, step_id, success, output, error) VALUES (?, ?, ?, ?, ?)",
                    (
                        episode_id,
                        obs.step_id,
                        int(obs.success),
                        obs.output,
                        obs.error,
                    ),
                )
            conn.commit()

    def persist_skill(self, skill: Skill) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO skills(name, description, template_json, success_count)
                VALUES(?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET
                    description=excluded.description,
                    template_json=excluded.template_json,
                    success_count=excluded.success_count
                """,
                (
                    skill.name,
                    skill.description,
                    json.dumps(skill.template),
                    skill.success_count,
                ),
            )
            conn.commit()

    def fetch_skills(self, hint: str) -> Iterable[Skill]:
        pattern = f"%{hint}%"
        with self._connect() as conn:
            for row in conn.execute(
                "SELECT name, description, template_json, success_count FROM skills WHERE description LIKE ? ORDER BY success_count DESC",
                (pattern,),
            ):
                yield Skill(
                    name=row[0],
                    description=row[1],
                    template=json.loads(row[2]),
                    success_count=row[3],
                )

