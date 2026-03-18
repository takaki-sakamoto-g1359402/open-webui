# Domain model

## Core entities

- **Role**: RBAC anchor.
- **User**: human/admin/operator identity.
- **ApiCredential**: future machine/service credential seam.
- **Space**: operational context or virtual environment.
- **PresenceSession**: active collaboration or operating session.
- **Participant**: who or what is present inside a session.
- **DigitalTwin**: modeled room, facility, asset, organization, or persona.
- **Agent**: registered automation or AI actor.
- **Task**: work request submitted to an agent.
- **TaskRun**: execution attempt and result.
- **Policy**: rule set applied to work or bridge actions.
- **PolicyDecision**: evaluation outcome and rationale.
- **Device**: robot, edge device, sensor, or humanoid endpoint record.
- **RobotBridge**: adapter registration and execution mode boundary.
- **AuditLog**: sensitive action trace.
- **EventCheckpoint**: worker consumption progress.

## Design choices

- String IDs keep the schema portable.
- JSON metadata fields support evolving payloads without immediate schema churn.
- Task and policy histories are first-class so later governance tooling has stable audit sources.
