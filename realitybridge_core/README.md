# RealityBridge Core

RealityBridge Core is a production-oriented scaffold for a platform that can evolve toward remote presence at civilization scale: virtual spaces, AI agents, digital twins, and future policy-gated execution bridges for real-world devices.

> Status: **foundational scaffold**. Runnable locally, safety-first, and intentionally conservative. It is **not** a production-ready remote actuation platform.

## Phase 1 — Architecture and plan

### Architecture summary

RealityBridge Core uses a **modular monorepo** and a **modular-service** backend rather than premature microservices. The initial implementation runs as:

- a FastAPI control plane API
- a Redis Streams-backed worker for asynchronous domain workflows
- PostgreSQL for authoritative state and audit history
- Redis for event transport and future workflow fan-out

### Module boundaries

- `apps/api`: external REST API, OpenAPI, auth boundary, request correlation, health endpoints.
- `apps/worker`: background processing of domain events from Redis Streams.
- `packages/core`: shared domain models, DB layer, routers, services, policy evaluation, bridge adapters.
- `docs/`: architecture, domain model, event flows, security notes, roadmap.
- `infra/docker`: local runtime image.
- `tests/`: unit and integration tests.

### Assumptions

- The first iteration optimizes for **developer operability** and **clean extension points**, not horizontal scale.
- Physical device execution remains blocked by default even if device and bridge records exist.
- JWT auth is sufficient for local development and early internal environments.
- Policy decisions are persisted inside the platform now, with a clean seam for a future OPA or Cedar-style policy engine.
- Redis Streams provides enough eventing discipline for early workflows before introducing Kafka/NATS-level complexity.

### Proposed repository tree

```text
realitybridge_core/
  apps/
    api/
    worker/
  packages/
    core/
      alembic/
      src/realitybridge_core/
  infra/docker/
  docs/
  scripts/
  tests/
  docker-compose.yml
  Makefile
  pyproject.toml
```

## Phase 2 — Scaffold implementation

### Implemented now

- JWT auth with bootstrap admin and RBAC roles.
- Space, session, participant, digital twin, agent, task, policy, device, bridge, and audit models.
- Task submission with policy evaluation and task-run persistence.
- Redis Streams publisher and worker consumer loop.
- Simulation-only bridge adapter for device actions.
- Structured JSON logging, request IDs, and readiness/liveness endpoints.
- Alembic initial migration.
- Seed script and integration tests.

## Quick start

### Option A: local Python

```bash
cd realitybridge_core
python3 -m venv .venv
. .venv/bin/activate
pip install -e .[dev]
cp .env.example .env
docker compose up -d postgres redis
cd packages/core && PYTHONPATH=src alembic upgrade head && cd ../..
PYTHONPATH=packages/core/src:. python scripts/seed_data.py
PYTHONPATH=packages/core/src:. uvicorn apps.api.main:app --host 0.0.0.0 --port 8090 --reload
```

### Option B: compose

```bash
cd realitybridge_core
docker compose up -d postgres redis
docker compose run --rm api sh -lc 'cd packages/core && PYTHONPATH=src alembic upgrade head'
docker compose up --build api worker
```

## Main flows to exercise

### 1. Enable bootstrap only for local dev/test and get an admin token

Set `RB_ENABLE_BOOTSTRAP=true` only in local development or tests. The endpoint returns `403` by default and should stay disabled in shared or deployed environments.

```bash
curl -s http://localhost:8090/api/v1/auth/bootstrap
```

### 2. Login as bootstrap admin

```bash
curl -s http://localhost:8090/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@realitybridge.local","password":"ChangeMe123!"}'
```

### 3. Create a space

```bash
curl -s http://localhost:8090/api/v1/spaces \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"mission-control","description":"Ops space","metadata":{"region":"us-east"}}'
```

### 4. Register an agent and submit a task

```bash
curl -s http://localhost:8090/api/v1/agents \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"navigator-agent","description":"Coordinates simulated work"}'

curl -s http://localhost:8090/api/v1/tasks \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"agent_id":"<agent-id>","kind":"task.coordinate","description":"Create a shift handoff summary","payload":{"risk":2}}'
```

### 5. Process a task manually only when needed

The worker already consumes `task.submitted` events. Manual processing is mainly for operator recovery/debug flows. Re-processing a task after a run exists returns the existing run; invalid states return `409 Conflict`.

```bash
curl -s -X POST http://localhost:8090/api/v1/tasks/<task-id>/process \
  -H "authorization: Bearer $TOKEN"
```

### 6. Simulate a device-oriented task

```bash
curl -s http://localhost:8090/api/v1/tasks \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"agent_id":"<agent-id>","kind":"device.inspect","description":"Simulate inspection","payload":{"device_id":"<device-id>","risk":1}}'
```

## Tooling

- `make setup` — install local environment
- `make lint` — run ruff
- `make typecheck` — run mypy
- `make test` — run pytest
- `make migrate` — apply Alembic migrations
- `make seed` — insert sample records

## Safety notes

- Database schema is expected to be managed by Alembic; the API no longer creates tables implicitly.
- Bootstrap auth is disabled by default and must be explicitly enabled only in `development` or `test`.
- Physical bridge execution is blocked by default.
- Sensitive tasks are denied unless explicit future policy work relaxes them.
- Device actions go through policy evaluation before any bridge execution attempt.
- Device actuation is simulation only in this iteration.
- Audit logging is included, but tamper-evident storage is deferred.

## Documentation map

- `docs/architecture.md`
- `docs/domain-model.md`
- `docs/event-flows.md`
- `docs/security-notes.md`
- `docs/future-roadmap.md`
