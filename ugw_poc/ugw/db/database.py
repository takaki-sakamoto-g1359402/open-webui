from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from typing import Iterator

from ugw.core.config import settings


def ensure_parent(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)


def get_connection(path: str) -> sqlite3.Connection:
    ensure_parent(path)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_session() -> Iterator[sqlite3.Connection]:
    conn = get_connection(settings.db_path)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


@contextmanager
def audit_db_session() -> Iterator[sqlite3.Connection]:
    conn = get_connection(settings.audit_db_path)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        pop_status TEXT NOT NULL,
        vc_status TEXT NOT NULL,
        vc_expiry TEXT,
        vc_revoked INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        legal_hold INTEGER DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS room_participants (
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        PRIMARY KEY (room_id, user_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        inviter_id TEXT NOT NULL,
        invitee_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        name TEXT NOT NULL,
        classification TEXT NOT NULL,
        current_version_digest TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS artifact_versions (
        id TEXT PRIMARY KEY,
        artifact_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        digest TEXT NOT NULL,
        prev_digest TEXT,
        author_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        metadata TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS trust_registry (
        user_id TEXT PRIMARY KEY,
        vc_status TEXT NOT NULL,
        expires_at TEXT,
        revoked INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS oracle_facts (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        fact_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        signature TEXT NOT NULL,
        issued_at TEXT NOT NULL
    );
    """,
]

AUDIT_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS audit_events (
        event_id TEXT PRIMARY KEY,
        event_hash TEXT NOT NULL,
        prev_hash TEXT,
        payload_encrypted TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS audit_checkpoints (
        id TEXT PRIMARY KEY,
        start_event_id TEXT NOT NULL,
        end_event_id TEXT NOT NULL,
        merkle_root TEXT NOT NULL,
        signature TEXT NOT NULL,
        key_id TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS audit_metadata (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_event_hash TEXT
    );
    """,
]


def init_db() -> None:
    with db_session() as conn:
        cursor = conn.cursor()
        for statement in SCHEMA:
            cursor.execute(statement)

    with audit_db_session() as conn:
        cursor = conn.cursor()
        for statement in AUDIT_SCHEMA:
            cursor.execute(statement)
        cursor.execute("INSERT OR IGNORE INTO audit_metadata (id, last_event_hash) VALUES (1, NULL)")
