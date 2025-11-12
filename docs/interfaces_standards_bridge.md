# Interfaces & Standards Bridge

## VDA5050-Compatible Command Layer
- Topic: `site/{SITE_ID}/command/vda5050`.
- Message schema:
```json
{
  "header": {
    "timestamp": "2025-05-01T12:00:00Z",
    "version": "2.0",
    "manufacturer": "edge-box",
    "serialNumber": "EBX-01"
  },
  "state": {
    "orderId": "task-001",
    "zoneSetId": "Z-Alpha",
    "actionId": "nav-001",
    "nodeId": "dock-A",
    "sequenceId": 12,
    "blocking": false
  },
  "actions": [
    {
      "actionType": "move",
      "actionId": "nav-001",
      "blockingType": "HARD",
      "parameters": [
        {"key": "target", "value": "dock-A"},
        {"key": "speedLimit", "value": "1.0"}
      ]
    },
    {
      "actionType": "skill",
      "actionId": "pick-01",
      "parameters": [
        {"key": "skill", "value": "pick"},
        {"key": "objectId", "value": "bin-22"}
      ]
    }
  ]
}
```
- Edge orchestrator converts internal task model to VDA5050 messages and publishes sequences per mission step.
- Safety policy service attaches clearance tokens via `parameters` field (`safetyToken`).

## RMF-Style Facility Resource Adapter
- Adapter API (FastAPI style):
  - `POST /facility/door/{door_id}/request` with payload `{ "task_id": str, "state": "OPEN"|"CLOSE", "priority": int }`.
  - `GET /facility/door/{door_id}` returns `{ "state": "OPEN", "last_updated": ISO8601 }`.
  - `POST /facility/elevator/{elevator_id}/command` with payload `{ "task_id": str, "floor": int, "mode": "AUTO" }`.
- MQTT Topics:
  - `site/{SITE_ID}/facility/door/{door_id}` publishes state updates.
  - `site/{SITE_ID}/facility/elevator/{elevator_id}` for cabin state.
- Adapter responsibilities:
  - Translate RMF schedule requests into facility-specific commands.
  - Provide availability windows to orchestrator for cost function adjustments.

## Skill API for Manipulation Tasks
- REST contract:
  - `POST /skills/execute`
    ```json
    {
      "skill": "pick",
      "task_id": "task-001",
      "robot_id": "R-1234",
      "goal": {
        "object_id": "bin-22",
        "pose_hint": {"x": 2.1, "y": 0.8, "z": 1.0},
        "grasp": "parallel"
      },
      "constraints": {
        "force_limit_n": 120,
        "approach_vector": [0, 0, -1],
        "keepout_zones": ["human_workspace"],
        "time_budget_s": 45
      }
    }
    ```
  - Response: `{ "accepted": true, "safety_token": "permit-789", "expected_duration_s": 30 }`.
- Skill catalog endpoint: `GET /skills` returns available skills with capability tags.
- Skills publish completion events on `site/{SITE_ID}/skill/{skill}/result` with payload `{ task_id, result, metrics }`.
- Safety policy service verifies constraints before issuing permit; failure returns HTTP 403 with reason.

