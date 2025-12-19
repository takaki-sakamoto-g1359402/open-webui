import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


DB_PATH = Path("agent.db")


def now_ts() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())


class Database:
    def __init__(self, path: Path = DB_PATH):
        self.path = Path(path)
        self._ensure_tables()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_tables(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS events(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT DEFAULT CURRENT_TIMESTAMP,
                    source TEXT,
                    payload TEXT,
                    status TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS facts(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT DEFAULT CURRENT_TIMESTAMP,
                    key TEXT,
                    value TEXT,
                    source TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS docs(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT DEFAULT CURRENT_TIMESTAMP,
                    title TEXT,
                    body TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS decisions(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT DEFAULT CURRENT_TIMESTAMP,
                    event_id INTEGER,
                    plan_json TEXT,
                    policy_result TEXT,
                    explanation TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS actions(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT DEFAULT CURRENT_TIMESTAMP,
                    decision_id INTEGER,
                    tool_name TEXT,
                    tool_input TEXT,
                    tool_output TEXT,
                    status TEXT,
                    reason TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS pop_tokens(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token TEXT,
                    issued_at TEXT,
                    expires_at TEXT
                )
                """
            )

    def add_event(self, source: str, payload: str, status: str = "pending") -> int:
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO events(source, payload, status, ts) VALUES (?, ?, ?, ?)",
                (source, payload, status, now_ts()),
            )
            return cur.lastrowid

    def get_pending_events(self) -> List[sqlite3.Row]:
        with self._connect() as conn:
            cur = conn.execute("SELECT * FROM events WHERE status='pending' ORDER BY id ASC")
            return cur.fetchall()

    def update_event_status(self, event_id: int, status: str) -> None:
        with self._connect() as conn:
            conn.execute("UPDATE events SET status=? WHERE id=?", (status, event_id))

    def add_fact(self, key: str, value: str, source: str = "user") -> int:
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO facts(key, value, source, ts) VALUES (?, ?, ?, ?)",
                (key, value, source, now_ts()),
            )
            return cur.lastrowid

    def add_doc(self, title: str, body: str) -> int:
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO docs(title, body, ts) VALUES (?, ?, ?)",
                (title, body, now_ts()),
            )
            return cur.lastrowid

    def search_facts(self, query: str) -> Dict[str, List[Dict[str, Any]]]:
        q = f"%{query.lower()}%"
        with self._connect() as conn:
            facts = [dict(r) for r in conn.execute("SELECT * FROM facts WHERE lower(value) LIKE ? OR lower(key) LIKE ?", (q, q)).fetchall()]
            docs = [dict(r) for r in conn.execute("SELECT * FROM docs WHERE lower(body) LIKE ? OR lower(title) LIKE ?", (q, q)).fetchall()]
            return {"facts": facts, "docs": docs}

    def add_decision(self, event_id: int, plan: Dict[str, Any], policy_result: str, explanation: str) -> int:
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO decisions(event_id, plan_json, policy_result, explanation, ts) VALUES (?, ?, ?, ?, ?)",
                (event_id, json.dumps(plan), policy_result, explanation, now_ts()),
            )
            return cur.lastrowid

    def update_decision(self, decision_id: int, policy_result: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE decisions SET policy_result=? WHERE id=?", (policy_result, decision_id)
            )

    def add_action(
        self,
        decision_id: int,
        tool_name: str,
        tool_input: Dict[str, Any],
        tool_output: Any,
        status: str,
        reason: str = "",
    ) -> int:
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO actions(decision_id, tool_name, tool_input, tool_output, status, reason, ts) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    decision_id,
                    tool_name,
                    json.dumps(tool_input),
                    json.dumps(tool_output, ensure_ascii=False),
                    status,
                    reason,
                    now_ts(),
                ),
            )
            return cur.lastrowid

    def recent_records(self, table: str, limit: int = 20) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.execute(
                f"SELECT * FROM {table} ORDER BY id DESC LIMIT ?", (limit,)
            )
            return [dict(r) for r in cur.fetchall()]

    def store_token(self, token: str, ttl_seconds: int = 600) -> None:
        issued = now_ts()
        expires = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(time.time() + ttl_seconds))
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO pop_tokens(token, issued_at, expires_at) VALUES (?, ?, ?)",
                (token, issued, expires),
            )

    def validate_token(self, token: Optional[str]) -> bool:
        if not token:
            return False
        with self._connect() as conn:
            cur = conn.execute(
                "SELECT * FROM pop_tokens WHERE token=? AND expires_at > ?",
                (token, now_ts()),
            )
            return cur.fetchone() is not None

