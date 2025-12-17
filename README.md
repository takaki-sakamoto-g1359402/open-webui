# RV-Loop Lab

Minimal but extensible proof-of-concept for a Real-Virtual feedback loop.

## Setup
1. Install dependencies (project already pins FastAPI/SQLAlchemy/etc via `pyproject.toml`). If using `pip`:
   ```bash
   pip install -e .
   ```

2. Initialize the database (created automatically on first run):
   ```bash
   python - <<'PY'
   from rvloop.models import init_db
   init_db()
   print("DB ready")
   PY
   ```

## Run the API
```bash
uvicorn rvloop.api:app --reload
```
Visit http://localhost:8000/ for the tiny dashboard.

## Send telemetry
Use the simulator to send a few telemetry events:
```bash
python -m rvloop.simulator --count 3
```
To call the processing loop in-process (no HTTP):
```bash
python -m rvloop.simulator --in-process --count 3
```

## Security signing (optional)
Telemetry payloads can include a `signature` field containing the hex-encoded result of `rvloop.security.sign(json_bytes)`. When provided, signatures are verified and invalid payloads are rejected with HTTP 400.

## Quantum sandbox
Set `RVLOOP_QUANTUM=1` to enable the quantum sandbox perturbation. If Qiskit is not installed, a deterministic fallback is used to keep the build stable.

## Tests
```bash
pytest
```
