from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Optional

from ugw.core.config import settings
from ugw.db.database import db_session
from ugw.utils.crypto import sha256_digest


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_blob(content: str) -> str:
    digest = sha256_digest(content.encode("utf-8"))
    os.makedirs(settings.artifact_store, exist_ok=True)
    path = os.path.join(settings.artifact_store, digest)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content)
    return digest


def create_artifact(room_id: str, artifact_id: str, name: str, classification: str, content: str, author_id: str) -> dict:
    digest = _write_blob(content)
    metadata = {"classification": classification}
    with db_session() as conn:
        conn.execute(
            "INSERT INTO artifacts (id, room_id, name, classification, current_version_digest) VALUES (?, ?, ?, ?, ?)",
            (artifact_id, room_id, name, classification, digest),
        )
        conn.execute(
            "INSERT INTO artifact_versions (id, artifact_id, version, digest, prev_digest, author_id, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                f"{artifact_id}-v1",
                artifact_id,
                1,
                digest,
                None,
                author_id,
                utc_now(),
                json.dumps(metadata),
            ),
        )
    return {"digest": digest, "version": 1, "classification": classification}


def update_artifact(artifact_id: str, content: str, author_id: str, classification: Optional[str]) -> dict:
    digest = _write_blob(content)
    with db_session() as conn:
        artifact = conn.execute("SELECT current_version_digest, classification FROM artifacts WHERE id = ?", (artifact_id,)).fetchone()
        if not artifact:
            raise ValueError("Artifact not found")
        current_digest = artifact[0]
        current_classification = artifact[1]
        new_classification = classification or current_classification
        version = conn.execute("SELECT COUNT(*) FROM artifact_versions WHERE artifact_id = ?", (artifact_id,)).fetchone()[0] + 1
        metadata = {"classification": new_classification}
        conn.execute(
            "INSERT INTO artifact_versions (id, artifact_id, version, digest, prev_digest, author_id, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                f"{artifact_id}-v{version}",
                artifact_id,
                version,
                digest,
                current_digest,
                author_id,
                utc_now(),
                json.dumps(metadata),
            ),
        )
        conn.execute(
            "UPDATE artifacts SET current_version_digest = ?, classification = ? WHERE id = ?",
            (digest, new_classification, artifact_id),
        )
    return {"digest": digest, "version": version, "classification": new_classification}


def list_versions(artifact_id: str) -> list[dict]:
    with db_session() as conn:
        rows = conn.execute(
            "SELECT version, digest, prev_digest, author_id, created_at, metadata FROM artifact_versions WHERE artifact_id = ? ORDER BY version",
            (artifact_id,),
        ).fetchall()
    return [
        {
            "version": row[0],
            "digest": row[1],
            "prev_digest": row[2],
            "author_id": row[3],
            "created_at": row[4],
            "metadata": json.loads(row[5]),
        }
        for row in rows
    ]
