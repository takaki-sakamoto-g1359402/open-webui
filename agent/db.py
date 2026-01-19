"""SQLite persistence helpers for the persistent agent prototype."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Iterable

DEFAULT_DB_PATH = Path("agent.db")


def get_connection(db_path: Path | str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    """Return a SQLite connection with row access by name."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    """Create tables if they do not exist."""
    cursor = conn.cursor()
    cursor.executescript(
        """
        CREATE TABLE IF NOT EXISTS identity_profile (
            id INTEGER PRIMARY KEY,
            identity_goal TEXT NOT NULL,
            creed TEXT NOT NULL,
            current_role TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY,
            timestamp TEXT NOT NULL,
            user_context TEXT NOT NULL,
            task TEXT NOT NULL,
            plan TEXT NOT NULL,
            thought_trace TEXT NOT NULL,
            outcome TEXT NOT NULL,
            reward_signals TEXT NOT NULL,
            episode_summary TEXT NOT NULL,
            episode_detail TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS models (
            name TEXT PRIMARY KEY,
            blob TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY,
            item TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()


def ensure_identity(conn: sqlite3.Connection) -> None:
    """Ensure an identity profile row exists."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS count FROM identity_profile")
    if cursor.fetchone()["count"] == 0:
        cursor.execute(
            """
            INSERT INTO identity_profile (identity_goal, creed, current_role)
            VALUES (?, ?, ?)
            """,
            (
                "Build and refine a reliable assistant persona that learns from experience.",
                "Always be safe, honest, and respectful. Refuse harmful or illegal actions.",
                "Local persistent assistant",
            ),
        )
        conn.commit()


def ensure_models(conn: sqlite3.Connection) -> None:
    """Ensure self and user model rows exist."""
    cursor = conn.cursor()
    defaults = {
        "self_model": {
            "skills": ["planning", "tool use"],
            "reliability": 0.6,
            "failure_modes": ["overconfident estimates"],
            "preferred_strategies": ["keep plans short", "confirm outcomes"],
        },
        "user_model": {
            "preferences": ["clear summaries"],
            "long_term_goals": [],
            "communication_style": "concise",
            "constraints": ["offline only"],
        },
    }
    for name, blob in defaults.items():
        cursor.execute("SELECT name FROM models WHERE name = ?", (name,))
        if cursor.fetchone() is None:
            cursor.execute(
                "INSERT INTO models (name, blob) VALUES (?, ?)",
                (name, json.dumps(blob)),
            )
    conn.commit()


def fetch_all(conn: sqlite3.Connection, query: str, params: Iterable[Any] = ()) -> list[sqlite3.Row]:
    cursor = conn.cursor()
    cursor.execute(query, params)
    return cursor.fetchall()


def fetch_one(conn: sqlite3.Connection, query: str, params: Iterable[Any] = ()) -> sqlite3.Row | None:
    cursor = conn.cursor()
    cursor.execute(query, params)
    return cursor.fetchone()
