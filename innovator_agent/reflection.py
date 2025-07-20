"""Episode memory with optional PostgreSQL vector support."""

import os
import sqlite3
from dataclasses import dataclass
from typing import Iterable, List, Optional

try:
    import psycopg2  # type: ignore
except ImportError:  # pragma: no cover - optional
    psycopg2 = None

DB_PATH = "history.db"


def _get_conn():
    url = os.getenv("PG_URL")
    if url and psycopg2:
        return psycopg2.connect(url)
    return sqlite3.connect(DB_PATH)


def init_db() -> None:
    """Create tables for episodes and shared policies."""
    conn = _get_conn()
    c = conn.cursor()
    if psycopg2 and isinstance(conn, psycopg2.extensions.connection):  # pragma: no cover - pg
        c.execute("CREATE EXTENSION IF NOT EXISTS vector")
        c.execute(
            "CREATE TABLE IF NOT EXISTS episodes (id SERIAL PRIMARY KEY, obs TEXT, action TEXT, success INTEGER)"
        )
        c.execute(
            "CREATE TABLE IF NOT EXISTS policies (id SERIAL PRIMARY KEY, robot TEXT, reward REAL, params vector(4))"
        )
    else:
        c.execute(
            "CREATE TABLE IF NOT EXISTS episodes (id INTEGER PRIMARY KEY AUTOINCREMENT, obs TEXT, action TEXT, success INTEGER)"
        )
        c.execute(
            "CREATE TABLE IF NOT EXISTS policies (robot TEXT, reward REAL, params TEXT)"
        )
    conn.commit()
    conn.close()


@dataclass
class Episode:
    observation: str
    action: str
    success: bool


def store_episode(ep: Episode) -> None:
    conn = _get_conn()
    c = conn.cursor()
    if psycopg2 and isinstance(conn, psycopg2.extensions.connection):  # pragma: no cover - pg
        c.execute(
            "INSERT INTO episodes (obs, action, success) VALUES (%s, %s, %s)",
            (ep.observation, ep.action, int(ep.success)),
        )
    else:
        c.execute(
            "INSERT INTO episodes (obs, action, success) VALUES (?, ?, ?)",
            (ep.observation, ep.action, int(ep.success)),
        )
    conn.commit()
    conn.close()


def latest_suggestion() -> str:
    conn = _get_conn()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM episodes WHERE success = 0")
    failures = c.fetchone()[0]
    conn.close()
    if failures:
        return "次はグリッパ速度+10%"
    return "Great work!"


def store_policy(robot: str, reward: float, params: Iterable[float]) -> None:
    conn = _get_conn()
    c = conn.cursor()
    seq = list(params)
    if psycopg2 and isinstance(conn, psycopg2.extensions.connection):  # pragma: no cover - pg
        c.execute(
            "INSERT INTO policies (robot, reward, params) VALUES (%s, %s, %s)",
            (robot, reward, seq),
        )
    else:
        c.execute(
            "INSERT INTO policies (robot, reward, params) VALUES (?, ?, ?)",
            (robot, reward, ",".join(map(str, seq))),
        )
    conn.commit()
    conn.close()


def best_policy() -> Optional[List[float]]:
    conn = _get_conn()
    c = conn.cursor()
    c.execute("SELECT params FROM policies ORDER BY reward DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    params = row[0]
    if isinstance(params, str):
        return [float(x) for x in params.split(",")]
    return list(params)
