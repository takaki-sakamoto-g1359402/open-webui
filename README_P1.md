# Heaven Blueprint Atlas (MVP Scaffold)

## Monorepo Structure
- `apps/web` Next.js frontend
- `apps/api` FastAPI backend
- `packages/core` shared domain types
- `packages/data-model` SQL schema
- `packages/ingestion` source adapters and contracts
- `packages/scoring` Heaven Score engine
- `packages/ai` evidence-bound analyst orchestration
- `docs` PRD, methodology, architecture, and source strategy
- `seed/mock_data.json` local seed dataset
- `tests` scoring and citation-integrity tests

## Local Development
### 1) API
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2) Web
```bash
cd apps/web
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Open `http://localhost:3000`.

## What Works in MVP
- Dashboard, country detail, source explorer, admin scaffold.
- Mock connectors for UN SDG, WHO UHC, World Bank poverty, UNICEF child well-being, UNESCO education, ILO child labour.
- Deterministic score + confidence separation.
- Scenario endpoint with explicit inferred label.
- Analyst endpoint that returns unverified when evidence is absent.

## Production Next Steps
See `docs/PRODUCTION_READINESS.md` for hardening gaps.
