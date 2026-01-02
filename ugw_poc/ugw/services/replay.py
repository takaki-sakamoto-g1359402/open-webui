from __future__ import annotations

from typing import Any, Dict, List

from ugw.utils.crypto import canonical_json, sha256_digest


def replay_events(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    state: Dict[str, Any] = {"rooms": {}, "artifacts": {}}
    processed = 0
    for event in events:
        if event.get("decision") != "allow":
            continue
        identity_valid = event.get("why", {}).get("identity", {}).get("valid", True)
        if not identity_valid:
            continue
        action = event.get("action")
        resource_id = event.get("resource_id")
        if action == "room:create":
            state["rooms"][resource_id] = {
                "created_by": event.get("actor_id"),
                "status": "open",
            }
            processed += 1
        elif action == "room:close" and resource_id in state["rooms"]:
            state["rooms"][resource_id]["status"] = "closed"
            processed += 1
        elif action == "artifact:create":
            state["artifacts"][resource_id] = {
                "digest": event.get("what", {}).get("digest"),
                "room_id": event.get("what", {}).get("room_id"),
            }
            processed += 1
        elif action == "artifact:update" and resource_id in state["artifacts"]:
            state["artifacts"][resource_id]["digest"] = event.get("what", {}).get("digest")
            processed += 1
    state_hash = sha256_digest(canonical_json(state))
    return {"state_hash": state_hash, "events_processed": processed}
