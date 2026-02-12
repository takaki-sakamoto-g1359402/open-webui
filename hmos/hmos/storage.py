from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

from hmos.models import PlanStep, RiskLevel, RunStatus, StepStatus
from hmos.utils.canonical_json import canonical_dumps


class Storage:
    def __init__(self, path: str) -> None:
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def _initialize(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    id TEXT PRIMARY KEY,
                    goal TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS steps (
                    id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    step_index INTEGER NOT NULL,
                    description TEXT NOT NULL,
                    connector TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    payload_hash TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    classification TEXT NOT NULL,
                    status TEXT NOT NULL,
                    FOREIGN KEY(run_id) REFERENCES runs(id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS approvals (
                    id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    step_id TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    payload_hash TEXT NOT NULL,
                    approved_at TEXT NOT NULL,
                    signature_stub TEXT NOT NULL,
                    FOREIGN KEY(run_id) REFERENCES runs(id),
                    FOREIGN KEY(step_id) REFERENCES steps(id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS audit_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    schema_version TEXT NOT NULL,
                    timestamp_utc TEXT NOT NULL,
                    trace_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    data_json TEXT NOT NULL,
                    prev_hash TEXT NOT NULL,
                    event_hash TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS idempotency (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    connector TEXT NOT NULL,
                    idempotency_key TEXT NOT NULL,
                    result_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(connector, idempotency_key)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS kill_switch (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    enabled INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                "INSERT OR IGNORE INTO kill_switch (id, enabled) VALUES (1, 0)"
            )

    def create_run(self, run_id: str, goal: str, status: RunStatus) -> None:
        now = self._now()
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO runs (id, goal, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (run_id, goal, status.value, now, now),
            )

    def update_run_status(self, run_id: str, status: RunStatus) -> None:
        now = self._now()
        with self._connect() as conn:
            conn.execute(
                "UPDATE runs SET status = ?, updated_at = ? WHERE id = ?",
                (status.value, now, run_id),
            )

    def add_steps(self, steps: Iterable[PlanStep]) -> None:
        with self._connect() as conn:
            for step in steps:
                payload_json = canonical_dumps(step.payload)
                payload_hash = self._hash_payload(payload_json)
                conn.execute(
                    """
                    INSERT INTO steps (id, run_id, step_index, description, connector, payload_json, payload_hash, risk_level, classification, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        step.step_id,
                        step.run_id,
                        step.index,
                        step.description,
                        step.connector,
                        payload_json,
                        payload_hash,
                        step.risk_level.value,
                        step.classification.value,
                        StepStatus.PENDING.value,
                    ),
                )

    def update_step_status(self, step_id: str, status: StepStatus) -> None:
        with self._connect() as conn:
            conn.execute("UPDATE steps SET status = ? WHERE id = ?", (status.value, step_id))

    def get_steps_for_run(self, run_id: str) -> list[sqlite3.Row]:
        with self._connect() as conn:
            return list(
                conn.execute(
                    "SELECT * FROM steps WHERE run_id = ? ORDER BY step_index", (run_id,)
                )
            )

    def get_step(self, step_id: str) -> Optional[sqlite3.Row]:
        with self._connect() as conn:
            return conn.execute("SELECT * FROM steps WHERE id = ?", (step_id,)).fetchone()

    def add_approval(
        self,
        approval_id: str,
        run_id: str,
        step_id: str,
        summary: str,
        destination: str,
        payload_hash: str,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO approvals (id, run_id, step_id, summary, destination, payload_hash, approved_at, signature_stub)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    approval_id,
                    run_id,
                    step_id,
                    summary,
                    destination,
                    payload_hash,
                    self._now(),
                    "signature:pending-pqc",
                ),
            )

    def has_approval(self, step_id: str) -> bool:
        with self._connect() as conn:
            row = conn.execute("SELECT 1 FROM approvals WHERE step_id = ?", (step_id,)).fetchone()
        return row is not None

    def store_idempotency_result(self, connector: str, key: str, result: Dict[str, Any]) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO idempotency (connector, idempotency_key, result_json, created_at) VALUES (?, ?, ?, ?)",
                (connector, key, canonical_dumps(result), self._now()),
            )

    def get_idempotency_result(self, connector: str, key: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT result_json FROM idempotency WHERE connector = ? AND idempotency_key = ?",
                (connector, key),
            ).fetchone()
        if row:
            return json.loads(row["result_json"])
        return None

    def list_audit_events(self) -> list[sqlite3.Row]:
        with self._connect() as conn:
            return list(conn.execute("SELECT * FROM audit_events ORDER BY id"))

    def get_last_audit_hash(self) -> str:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT event_hash FROM audit_events ORDER BY id DESC LIMIT 1"
            ).fetchone()
        return row["event_hash"] if row else "0" * 64

    def insert_audit_event(
        self,
        schema_version: str,
        timestamp_utc: str,
        trace_id: str,
        event_type: str,
        data_json: str,
        prev_hash: str,
        event_hash: str,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO audit_events (schema_version, timestamp_utc, trace_id, event_type, data_json, prev_hash, event_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (schema_version, timestamp_utc, trace_id, event_type, data_json, prev_hash, event_hash),
            )

    def set_kill_switch(self, enabled: bool) -> None:
        with self._connect() as conn:
            conn.execute("UPDATE kill_switch SET enabled = ? WHERE id = 1", (1 if enabled else 0,))

    def get_kill_switch(self) -> bool:
        with self._connect() as conn:
            row = conn.execute("SELECT enabled FROM kill_switch WHERE id = 1").fetchone()
        return bool(row["enabled"]) if row else False

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _hash_payload(payload_json: str) -> str:
        import hashlib

        return hashlib.sha256(payload_json.encode("utf-8")).hexdigest()
