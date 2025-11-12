FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY edge/requirements.txt ./requirements-edge.txt
RUN pip install --no-cache-dir -r requirements-edge.txt
COPY edge edge
COPY schemas schemas
COPY docs docs
ENV PYTHONPATH=/app
CMD ["uvicorn", "edge.orchestrator.app:app", "--host", "0.0.0.0", "--port", "8080"]
