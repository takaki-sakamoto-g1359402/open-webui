# Humane AI Orchestrator (Prototype)

A small FastAPI prototype that encodes principles and simple policy checks to keep AI tooling aligned with human safety, autonomy, and democratic well-being. Everything runs in-memory; no external services are needed.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r humane_orchestrator/requirements.txt
```

## Run the API

```bash
uvicorn humane_orchestrator.app.main:app --reload
```

## Run Tests

```bash
pytest humane_orchestrator/tests
```

## Quick demo

```bash
# 1) Register a tool with mass persuasion capability
curl -X POST http://localhost:8000/tools \
  -H "Content-Type: application/json" \
  -d '{
    "id": "tool-1",
    "name": "Campaign Persuader",
    "description": "Targets voters with tailored messages",
    "capabilities": [{"id": "cap-1", "name": "Mass Persuasion", "description": "Micro-targeting at scale"}],
    "risks": []
  }'

# 2) Register a political campaign use-case
curl -X POST http://localhost:8000/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "id": "prop-1",
    "title": "Election Outreach",
    "description": "Target swing voters",
    "tool_id": "tool-1",
    "intended_audience": "Voters",
    "context": "Political campaign"
  }'

# 3) Evaluate and observe democratic-risk warning
curl -X POST http://localhost:8000/proposals/prop-1/evaluate
```

