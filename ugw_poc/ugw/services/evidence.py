from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone

from ugw.audit.log import export_events, get_checkpoints, verify_log
from ugw.core.config import settings
from ugw.db.database import db_session
from ugw.utils.crypto import canonical_json, sha256_digest


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def export_bundle(room_id: str, include_confidential: bool) -> dict:
    os.makedirs(settings.evidence_store, exist_ok=True)
    bundle_id = str(uuid.uuid4())
    bundle_path = os.path.join(settings.evidence_store, f"bundle-{bundle_id}.json")

    with db_session() as conn:
        artifacts = conn.execute("SELECT id, classification, current_version_digest FROM artifacts WHERE room_id = ?", (room_id,)).fetchall()

    artifact_records = []
    for artifact in artifacts:
        if artifact["classification"] == "CONFIDENTIAL" and not include_confidential:
            continue
        artifact_records.append(
            {
                "artifact_id": artifact["id"],
                "classification": artifact["classification"],
                "digest": artifact["current_version_digest"],
            }
        )

    events = export_events()
    checkpoints = get_checkpoints()
    verification = verify_log()
    report = {
        "bundle_id": bundle_id,
        "room_id": room_id,
        "created_at": utc_now(),
        "events": len(events),
        "checkpoints": len(checkpoints),
        "verification": verification,
    }

    payload = {
        "report": report,
        "events": events,
        "checkpoints": checkpoints,
        "artifacts": artifact_records,
    }

    with open(bundle_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)

    bundle_digest = sha256_digest(canonical_json(payload))
    return {"bundle_id": bundle_id, "path": bundle_path, "digest": bundle_digest}
