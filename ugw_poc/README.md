# UGW FounderWorld / DealOS PoC

## Setup
```bash
cd ugw_poc
docker compose up --build
```

## Local Dev
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn ugw.api.main:app --reload
```

## CLI
```bash
python -m ugw.cli.main verify-log
python -m ugw.cli.main replay
```

## Tests
```bash
pytest ugw/tests
```
