from __future__ import annotations

from ugw.services.replay import replay_events


def test_replay_determinism():
    events = [
        {
            "decision": "allow",
            "why": {"identity": {"valid": True}},
            "action": "room:create",
            "resource_id": "room-1",
            "actor_id": "user-1",
        },
        {
            "decision": "allow",
            "why": {"identity": {"valid": True}},
            "action": "artifact:create",
            "resource_id": "art-1",
            "what": {"digest": "abc"},
        },
    ]
    first = replay_events(events)
    second = replay_events(events)
    assert first["state_hash"] == second["state_hash"]
