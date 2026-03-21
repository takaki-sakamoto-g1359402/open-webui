FROM python:3.11-slim

WORKDIR /app
COPY pyproject.toml README.md ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts
COPY docs ./docs
RUN pip install --no-cache-dir -e .
ENV PYTHONPATH=/app/packages/core/src:/app
