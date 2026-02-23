# Orchestrator OS (Riai)

Safety-first, local-first AI orchestration scaffold with policy gates, approvals, and hash-chained auditing.

## Quickstart

```bash
cd orchestrator_os
python -m venv .venv && source .venv/bin/activate
pip install -e .[dev]
python -m orchestrator_os.cli run --goal "hello"
uvicorn orchestrator_os.main:app --reload
```

## Architecture overview

- **Riai Orchestrator**: coordinates planner/executor/critic/librarian flow.
- **Runtime state machine**: `CREATED -> PLANNED -> EXECUTING -> REVIEWING -> (WAITING_FOR_APPROVAL|COMPLETED|FAILED)`.
- **Policy engine**: enforces risk-tier defaults (R0 allow, R1 sandbox-gated, R2 approval, R3 deny+whitelist+approval).
- **Tool registry**: typed schemas for inputs/outputs and declared scopes.
- **SQLite storage**: tasks, approvals, audit events, memories in `./workspace/.db/`.
- **Audit chain**: append-only events with canonical JSON and SHA256 hash chaining.

## How approvals work

1. Runtime evaluates each tool call against policy.
2. `REQUIRE_APPROVAL` creates a persisted approval record and task enters `WAITING_FOR_APPROVAL`.
3. Human decides via CLI/API (`APPROVE`/`DENY`).
4. Task can be resumed once no pending approvals remain.

## How to add a tool

1. Create a tool class in `src/orchestrator_os/tools/` with:
   - pydantic input/output models
   - `name`, `description`, `risk_tier`, `required_scopes`
   - `run()` implementation and sandbox checks (if applicable)
2. Register it in `core/orchestrator.py` via `ToolSpec`.
3. Ensure policy tier is appropriate and add tests.

## How to add an agent

1. Add an agent module in `src/orchestrator_os/agents/` with prompt + logic.
2. Wire into `core/runtime.py` for orchestration flow.
3. Emit audit events for every decision/action.

## Security notes + minimal threat model

- **No silent side-effects**: every major decision and action is audited.
- **Kill switch**: `ORCHESTRATOR_DISABLED=true` blocks all execution.
- **Filesystem sandbox**: `filesystem` tool cannot escape `./workspace` and blocks traversal.
- **Network default**: no real fetches by default; `web_fetch` returns mock output.
- **Secrets**: env var only, never logged.

Threats considered: path traversal, unauthorized side-effects, missing approvals, tampered logs.

## Offline mode

If `OPENAI_API_KEY` is unset, runtime automatically uses deterministic `MockLLM` so all flows run fully offline.
