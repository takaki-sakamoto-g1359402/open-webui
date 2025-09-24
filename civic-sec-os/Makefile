.PHONY: demo lint test

PYTHON := python3

lint:
@echo "Lint placeholder - integrate ruff/flake8"

test:
pytest tests

demo:
$(PYTHON) -c "from tests.demo_runner import run_demo; print(run_demo())"
