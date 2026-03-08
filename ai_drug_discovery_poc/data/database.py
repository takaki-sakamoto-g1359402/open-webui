"""Database management for metadata and experiment tracking."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

import logging
import sqlite3

logger = logging.getLogger(__name__)


@dataclass
class Database:
    """Lightweight database wrapper using SQLite or PostgreSQL-compatible URIs.

    Args:
        uri: Database URI. SQLite paths supported with sqlite:///path/to.db.
    """

    uri: str

    def _connect(self) -> sqlite3.Connection:
        """Create a database connection."""
        if self.uri.startswith("sqlite:///"):
            db_path = self.uri.replace("sqlite:///", "")
            logger.debug("Connecting to SQLite database at %s", db_path)
            return sqlite3.connect(db_path)
        raise ValueError("Only sqlite:/// URIs are supported in the POC.")

    def initialize(self) -> None:
        """Initialize tables for storing metadata and experiment results."""
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS experiment_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    molecule TEXT,
                    target TEXT,
                    score REAL,
                    metadata TEXT
                )
                """
            )
            conn.commit()
        logger.info("Database initialized")

    def insert_results(self, rows: Iterable[tuple[str, str, float, str]]) -> None:
        """Insert experiment results.

        Args:
            rows: Iterable of (molecule, target, score, metadata) tuples.
        """
        row_list = list(rows)
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.executemany(
                "INSERT INTO experiment_results (molecule, target, score, metadata) VALUES (?, ?, ?, ?)",
                row_list,
            )
            conn.commit()
        logger.info("Inserted %s rows", len(row_list))

    def fetch_results(self) -> list[dict[str, Any]]:
        """Fetch all experiment results.

        Returns:
            List of result dictionaries.
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT molecule, target, score, metadata FROM experiment_results")
            rows = cursor.fetchall()
        return [
            {"molecule": row[0], "target": row[1], "score": row[2], "metadata": row[3]}
            for row in rows
        ]
