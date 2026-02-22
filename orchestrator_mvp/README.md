# Orchestrator-MVP (Plan → Act → Reflect)

A local-first MVP orchestrator built with **Python 3.11+**, **FastAPI**, and **SQLite**.

## Scope in this scaffold

This initial scaffold provides:

- Project directory structure for API, orchestrator, tools, storage, UI, and tests.
- `requirements.txt` with runtime + test dependencies.
- `.env.example` for local configuration without secrets in code.
- Placeholder package modules to support incremental implementation.

## Planned features

- Task API (`/tasks`, `/tasks/{id}/run`, `/tasks/{id}`)
- Human approval flow (`/approvals`, `/approvals/{approval_id}`)
- Deterministic `MockLLM` planner with optional OpenAI planner
- Safe-by-default tool execution gates
- SQLite persistence (`tasks`, `steps`, `approvals`)
- Append-only JSONL audit log (`./logs/audit.jsonl`)
- Minimal web UI
- Pytest suite for task creation, execution, and approval flow

## Local setup

```bash
cd orchestrator_mvp
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run (after implementation)

```bash
uvicorn app.main:app --reload
```

## Test

```bash
pytest
```

## Directory layout

```text
orchestrator_mvp/
├── app/
│   ├── api/
│   ├── core/
│   ├── db/
│   ├── orchestrator/
│   ├── tools/
│   ├── static/
│   └── templates/
├── logs/
├── sandbox_data/
├── tests/
├── .env.example
├── requirements.txt
└── README.md
```
