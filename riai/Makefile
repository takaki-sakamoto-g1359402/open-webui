.PHONY: install test lint clean

install:
	pip install -e .[dev]

test:
	pytest

lint:
	@echo "No linters configured."

clean:
	rm -f data/memories.sqlite3
