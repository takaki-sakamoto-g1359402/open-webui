from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from cryptography.fernet import Fernet

from ugw.audit.merkle import merkle_root
from ugw.core.config import settings
from ugw.core.keys import get_encryption_key, get_keystore, load_private_key, load_public_key
from ugw.db.database import audit_db_session
from ugw.utils.crypto import canonical_json, sha256_digest


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _encrypt_payload(payload: Dict[str, Any]) -> str:
    key = get_encryption_key().load()
    fernet = Fernet(key)
    token = fernet.encrypt(canonical_json(payload))
    return token.decode("utf-8")


def _decrypt_payload(token: str) -> Dict[str, Any]:
    key = get_encryption_key().load()
    fernet = Fernet(key)
    raw = fernet.decrypt(token.encode("utf-8"))
    return json.loads(raw)


def append_event(event: Dict[str, Any]) -> Dict[str, Any]:
    event_id = event.get("event_id") or str(uuid.uuid4())
    event["event_id"] = event_id
    event["timestamp"] = event.get("timestamp") or _utc_now()

    payload = canonical_json(event)
    event_hash = sha256_digest(payload)

    with audit_db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT last_event_hash FROM audit_metadata WHERE id = 1")
        row = cursor.fetchone()
        prev_hash = row[0] if row else None

        encrypted = _encrypt_payload(event)
        cursor.execute(
            "INSERT INTO audit_events (event_id, event_hash, prev_hash, payload_encrypted, created_at) VALUES (?, ?, ?, ?, ?)",
            (event_id, event_hash, prev_hash, encrypted, event["timestamp"]),
        )
        cursor.execute("UPDATE audit_metadata SET last_event_hash = ? WHERE id = 1", (event_hash,))

        cursor.execute("SELECT event_hash, event_id FROM audit_events ORDER BY created_at")
        rows = cursor.fetchall()
        if len(rows) % settings.merkle_checkpoint_interval == 0:
            recent = rows[-settings.merkle_checkpoint_interval :]
            root = merkle_root([row[0] for row in recent])
            checkpoint_id = str(uuid.uuid4())
            key_record = get_keystore().ensure_active_key()
            private_key = load_private_key(key_record.private_key)
            signature = private_key.sign(root.encode("utf-8"))
            cursor.execute(
                "INSERT INTO audit_checkpoints (id, start_event_id, end_event_id, merkle_root, signature, key_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    checkpoint_id,
                    recent[0][1],
                    recent[-1][1],
                    root,
                    signature.hex(),
                    key_record.key_id,
                    _utc_now(),
                ),
            )

    return event


def list_events(filters: Dict[str, Any]) -> List[Dict[str, Any]]:
    conditions = []
    params: List[Any] = []
    if actor_id := filters.get("actor_id"):
        conditions.append("payload_encrypted LIKE ?")
        params.append(f"%\"actor_id\":\"{actor_id}\"%")
    if resource_id := filters.get("resource_id"):
        conditions.append("payload_encrypted LIKE ?")
        params.append(f"%\"resource_id\":\"{resource_id}\"%")
    query = "SELECT payload_encrypted FROM audit_events"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(filters.get("limit", 50))

    with audit_db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()

    events = [_decrypt_payload(row[0]) for row in rows]
    decision = filters.get("decision")
    start_time = filters.get("start_time")
    end_time = filters.get("end_time")
    if decision:
        events = [event for event in events if event.get("decision") == decision]
    if start_time:
        events = [event for event in events if event.get("timestamp") >= start_time]
    if end_time:
        events = [event for event in events if event.get("timestamp") <= end_time]
    return events


def verify_log() -> Dict[str, Any]:
    with audit_db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT event_hash, prev_hash, payload_encrypted FROM audit_events ORDER BY created_at")
        events = cursor.fetchall()
        cursor.execute("SELECT * FROM audit_checkpoints ORDER BY created_at")
        checkpoints = cursor.fetchall()

    prev_hash = None
    for event_hash, stored_prev, encrypted in events:
        payload = _decrypt_payload(encrypted)
        recomputed = sha256_digest(canonical_json(payload))
        if recomputed != event_hash:
            return {"verified": False, "message": "Event hash mismatch", "details": {"event_id": payload.get("event_id")}}
        if stored_prev != prev_hash:
            return {"verified": False, "message": "Hash chain broken", "details": {"event_id": payload.get("event_id")}}
        prev_hash = event_hash

    for checkpoint in checkpoints:
        _, start_event_id, end_event_id, root, signature, key_id, _ = checkpoint
        hashes = []
        for event_hash, _, encrypted in events:
            payload = _decrypt_payload(encrypted)
            if payload["event_id"] == start_event_id:
                hashes = [event_hash]
            elif hashes:
                hashes.append(event_hash)
            if payload["event_id"] == end_event_id and hashes:
                break
        computed_root = merkle_root(hashes)
        if computed_root != root:
            return {"verified": False, "message": "Merkle root mismatch", "details": {"checkpoint_id": checkpoint[0]}}
        key_record = get_keystore().get_key(key_id)
        public_key = load_public_key(key_record.public_key)
        try:
            public_key.verify(bytes.fromhex(signature), root.encode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            return {"verified": False, "message": "Checkpoint signature invalid", "details": {"error": str(exc)}}

    return {"verified": True, "message": "Audit log verified", "details": {"events": len(events), "checkpoints": len(checkpoints)}}


def export_events(event_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    with audit_db_session() as conn:
        cursor = conn.cursor()
        if event_ids:
            placeholders = ",".join("?" for _ in event_ids)
            cursor.execute(f"SELECT payload_encrypted FROM audit_events WHERE event_id IN ({placeholders})", event_ids)
        else:
            cursor.execute("SELECT payload_encrypted FROM audit_events ORDER BY created_at")
        rows = cursor.fetchall()
    return [_decrypt_payload(row[0]) for row in rows]


def get_checkpoints() -> List[Dict[str, Any]]:
    with audit_db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, start_event_id, end_event_id, merkle_root, signature, key_id, created_at FROM audit_checkpoints ORDER BY created_at")
        rows = cursor.fetchall()
    return [
        {
            "id": row[0],
            "start_event_id": row[1],
            "end_event_id": row[2],
            "merkle_root": row[3],
            "signature": row[4],
            "key_id": row[5],
            "created_at": row[6],
        }
        for row in rows
    ]
