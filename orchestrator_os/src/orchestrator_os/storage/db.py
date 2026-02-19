"""SQLite helpers and table bootstrap."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from orchestrator_os.config import get_settings


DDL = [
    """
    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      summary TEXT NOT NULL,
      artifacts_json TEXT NOT NULL,
      audit_event_ids_json TEXT NOT NULL,
      approvals_pending_json TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS approvals (
      approval_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      task_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      risk_tier TEXT NOT NULL,
      scopes_json TEXT NOT NULL,
      request_payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      decision_at TEXT,
      decision_by TEXT,
      decision_reason TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      task_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      metadata_json TEXT NOT NULL
    )
    """,
]


def get_connection() -> sqlite3.Connection:
    settings = get_settings()
    db_path: Path = settings.db_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        for stmt in DDL:
            conn.execute(stmt)
        conn.commit()
