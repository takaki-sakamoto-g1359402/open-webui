# AI-Augmented VTuber Governance System (PoC)

This proof-of-concept demonstrates a governance-focused stack for VTuber scheduling, risk management, and safe chat handling.

## Backend (FastAPI)

### Setup
1. Create a virtual environment and install dependencies:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Run the API:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

### Key Endpoints
- `GET /health` – health check
- `GET /talents` / `POST /talents` – list and create talents
- `GET /talents/{id}/fatigue` – compute fatigue score
- `POST /scheduler/run` – generate weekly schedule recommendations
- `GET /scheduler/recommendations?week_start=YYYY-MM-DD` – list stored recommendations
- `POST /chat/reply` – moderate and optionally reply with an LLM (uses `OPENAI_API_KEY` if set)
- `GET /chat/logs` – recent moderated chat logs

Data persists to `backend/app.db` (SQLite). Set `OPENAI_API_KEY` to enable LLM calls; without it, safe fallbacks are used.

## Frontend (Next.js)

### Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```
3. Ensure the backend is running on `http://localhost:8000` (the UI uses this base URL).

### Pages
- `/` – navigation hub
- `/talents` – talent table with fatigue lookups
- `/scheduler` – run and view schedule recommendations
- `/chat` – send moderated messages, view replies, and see recent chat logs

This PoC is intentionally small and favors clarity over completeness; extend the services and models as needed for production scenarios.
