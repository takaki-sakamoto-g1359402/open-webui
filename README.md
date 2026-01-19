# RV-Loop Lab

Minimal but extensible proof-of-concept for a Real-Virtual feedback loop.

## System-3 Persistent Agent Prototype (PoC)
This repository includes a minimal, runnable prototype of a System-3 “Persistent Agent” wrapper inspired by the Sophia framework. It runs offline with a SQLite-backed memory, rule-based models, and a mockable LLM interface.

### Quickstart
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Example session
```
Task (or 'quit'): calculate 3+4*2

Plan:
- Compute the value
  • Use calculator tool
  • Report the result

Tool Trace:
- calc: 3+4*2 = 11

Result:
3+4*2 = 11

System-3 Reflection:
Completed task. Reward: {'extrinsic': 1.0, 'novelty': 0.6, 'mastery': 0.8, 'coherence': 0.4, 'efficiency': 0.7}
```

### CLI commands
* `/identity` - show identity profile
* `/memory <query>` - retrieve similar episode summaries
* `/models` - show self/user models
* `/reset` - clear the SQLite database (with confirmation)

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

## OpenUSD Bridge (MVP)

This repository now includes a minimal OpenUSD bridge that can load, inspect, edit, and save USD stages. It exposes a FastAPI service, a small CLI, and a runnable demo using the sample scene in `assets/sample_scene.usda`.

### Installation (Python 3.11+)
1. Optional: create a virtual environment.
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
2. Install dependencies (PyPI wheels for `usd-core`/`usd-core-tools` are preferred):
   ```bash
   pip install -e .
   ```

### Run the API server
Start the FastAPI app with uvicorn:
```bash
uvicorn openusd_bridge.api:app --reload
```

Example usage with `curl`:
```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/stage/load \
  -H "Content-Type: application/json" \
  -d '{"path": "assets/sample_scene.usda"}'
# Use the returned stage_id
curl "http://localhost:8000/stage/<stage_id>/prims"
curl "http://localhost:8000/stage/<stage_id>/xform?prim_path=/World/Cube"
curl -X POST "http://localhost:8000/stage/<stage_id>/xform" \
  -H "Content-Type: application/json" \
  -d '{"prim_path": "/World/Cube", "translate": [0, 1, 0], "rotate": [0, 0, 0], "scale": [1, 1, 1]}'
curl -X POST "http://localhost:8000/stage/<stage_id>/add_prim" \
  -H "Content-Type: application/json" \
  -d '{"prim_path": "/World/NewCube", "prim_type": "Cube"}'
curl -X POST "http://localhost:8000/stage/<stage_id>/save" \
  -H "Content-Type: application/json" \
  -d '{"path": "out.usda", "format": "usda"}'
```

### CLI
A lightweight CLI is available via `openusd-bridge`:
```bash
# Run the end-to-end demo
openusd-bridge demo

# List prims in a USD stage
openusd-bridge list --file assets/sample_scene.usda

# Set a prim transform and save to a new file
openusd-bridge set-xform --file assets/sample_scene.usda \
  --prim /World/Cube --t 0 1 0 --r 0 0 0 --s 1 1 1 --out out.usda
```

### Demo script
The demo can be run directly:
```bash
python -m openusd_bridge.demo
```
This loads `assets/sample_scene.usda`, adds `/World/DemoCube`, applies a transform, saves `out.usda`, and prints a prim summary. If `usdrecord` is available it will also attempt to render a preview image.

### Tests
Run the focused tests for the bridge:
```bash
pytest tests/test_usd_ops.py
```

### Troubleshooting
- If `usd-core` (and optional `usd-core-tools`) wheels are unavailable for your platform, build OpenUSD from source following the official instructions for your OS. After building, set `PYTHONPATH` to point at the installed USD Python modules so that `from pxr import Usd` succeeds.
- The API stores loaded stages in memory keyed by UUIDs; restarting the server clears the stage cache.
