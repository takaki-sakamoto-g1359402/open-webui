FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ugw /app/ugw

ENV UGW_DB_PATH=/app/data/app.db
ENV UGW_AUDIT_DB_PATH=/app/data/audit.db
ENV UGW_ARTIFACT_STORE=/app/artifact_store
ENV UGW_EVIDENCE_STORE=/app/evidence
ENV UGW_OPA_URL=http://opa:8181
ENV UGW_OPA_TOKEN=dev-opa-token

EXPOSE 8000

CMD ["uvicorn", "ugw.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
