.PHONY: setup build test sim eval lint format clean

VENV_DIR := .venv
PYTHON := python3
VENV_PYTHON := $(VENV_DIR)/bin/python
VENV_PIP := $(VENV_DIR)/bin/pip
VENV_RUFF := $(VENV_DIR)/bin/ruff
VENV_MYPY := $(VENV_DIR)/bin/mypy
VENV_PYTEST := $(VENV_DIR)/bin/pytest

setup:
	$(PYTHON) -m venv $(VENV_DIR)
	($(VENV_PYTHON) -m pip install --upgrade pip) || true
	($(VENV_PIP) install -r requirements.txt) || true

build:
	@if command -v colcon >/dev/null 2>&1; then \
		colcon build --packages-select "ew_*" || true; \
	else \
		echo "colcon not found; skipping ROS 2 build for this environment."; \
	fi

test:
	@if [ -x $(VENV_PYTEST) ]; then \
		$(VENV_PYTEST) -q || true; \
	else \
		pytest -q || true; \
	fi

sim:
	@echo "[sim] Placeholder target — SITL scenarios will be added in milestone P6."

eval:
	@echo "[eval] Placeholder target — evaluation workflows will be added in milestone P7."

lint:
	@if [ -x $(VENV_RUFF) ]; then \
		$(VENV_RUFF) check .; \
	else \
		ruff check .; \
	fi
	@if [ -x $(VENV_MYPY) ]; then \
		$(VENV_MYPY) src/common; \
	else \
		mypy src/common; \
	fi

format:
	@if [ -x $(VENV_RUFF) ]; then \
		$(VENV_RUFF) format .; \
	else \
		ruff format .; \
	fi

clean:
	rm -rf $(VENV_DIR) build install log
