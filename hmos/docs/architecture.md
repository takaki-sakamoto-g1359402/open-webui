# HM-OS Architecture

## Brain (Planning + Execution)
- Planner: generates steps with explicit risk levels.
- Orchestrator: persists plan (PLAN_CREATED) before any execution.
- Policy engine: enforces Risk2 approvals and blocks Risk3.

## Nervous System (Events + State)
- Event bus abstraction with an in-memory backend for tests and a Redis Streams backend for production.
- Events emitted: GOAL_CREATED, PLAN_CREATED, STEP_PROPOSED, STEP_APPROVED, STEP_EXECUTED, STEP_FAILED.
- Deterministic audit hash chain for traceability.

## Body (Connectors)
- Web search stub (no live browsing).
- HTTP API connector with allowlist, idempotency keys, and safe logging.
- File system connector with sandboxed root and path traversal prevention.
- Humanoid device simulator.
