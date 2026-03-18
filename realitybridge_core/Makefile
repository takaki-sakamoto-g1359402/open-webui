PYTHON ?= python3
VENV ?= .venv
ACTIVATE = . $(VENV)/bin/activate
PIP = $(VENV)/bin/pip
PYTEST = $(VENV)/bin/pytest
RUFF = $(VENV)/bin/ruff
MYPY = $(VENV)/bin/mypy
ALEMBIC = $(VENV)/bin/alembic
UVICORN = $(VENV)/bin/uvicorn

.PHONY: setup lint format typecheck test run-api run-worker migrate seed

setup:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install -e .[dev]

lint:
	$(RUFF) check .

format:
	$(RUFF) format .

typecheck:
	$(MYPY) packages/core/src

test:
	PYTHONPATH=packages/core/src:. $(PYTEST)

run-api:
	PYTHONPATH=packages/core/src:. $(UVICORN) apps.api.main:app --host 0.0.0.0 --port 8090 --reload

run-worker:
	PYTHONPATH=packages/core/src:. $(PYTHON) -m apps.worker.main

migrate:
	cd packages/core && PYTHONPATH=src alembic upgrade head

seed:
	PYTHONPATH=packages/core/src:. $(PYTHON) scripts/seed_data.py
