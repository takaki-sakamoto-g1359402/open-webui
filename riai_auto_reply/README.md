# Riai Auto-Reply Agent (PoC)

Riai Auto-Reply Agent is a policy-aware, semi-autonomous responder that monitors Slack and Gmail, classifies inbound conversations with the OpenAI Responses API, drafts polite bilingual replies, and auto-sends only when policy permits. All other responses are routed to a lightweight approval UI for human review.

## Features

- **Unified intake** for Slack Events API webhooks and Gmail polling (stub) with normalization into a shared schema.
- **Intent, urgency, and risk scoring** via the OpenAI `gpt-5` Responses API with strict JSON output validation.
- **Template-aware drafting** in Japanese or English with automatic length enforcement and JST timestamps for scheduling contexts.
- **Safety-first gating** using YAML policy rules: forbidden keywords, sender allow list, attachment checks, and risk thresholds.
- **Dry-run by default** so no external message leaves the system until operators flip the flag in `.env`.
- **Structured auditing** with SQLite persistence for inbound messages, drafts, and delivery logs.
- **Replayable approvals UI** served by FastAPI for approving or rejecting drafts.
- **Dockerized runtime** and helper scripts for rapid setup, plus pytest coverage for policy and LLM contract expectations.

## Project layout

```
app/            # FastAPI app, domain logic, connectors, storage
config/         # Policy configuration
scripts/        # Setup and developer tooling
templates/      # Reply scaffolds used by the LLM fallback
tests/          # pytest suites
web/            # Minimal admin interface
```

## Getting started

### Prerequisites
- Python 3.11+
- OpenAI API key with access to `gpt-5`
- Slack app credentials (Events + Web API)
- Optional: Docker 24+

### Local setup

```bash
bash scripts/bootstrap.sh
source .venv/bin/activate
uvicorn app.main:app --reload
```

The script installs dependencies, seeds `.env`, and creates the SQLite database. The API listens on `http://localhost:8000`.

### Environment variables

All configuration lives in `.env`:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI credential for Responses API |
| `SLACK_BOT_TOKEN` | Token for Slack Web API sends |
| `SLACK_SIGNING_SECRET` | Shared secret for verifying Slack requests |
| `GMAIL_SERVICE_ACCOUNT_JSON` | Path to Gmail credential file (not used in stub) |
| `DATABASE_URL` | SQLModel-compatible database URL |
| `DRY_RUN` | `true` keeps sends local; set `false` to enable external delivery |
| `LOG_LEVEL` | Logging level (defaults to INFO) |
| `TIMEZONE` | Override default `Asia/Tokyo` |

### Slack app configuration

1. Create a Slack app and enable the Events API.
2. Set the request URL to `https://<your-host>/webhook/slack`.
3. Subscribe to `message.channels` and other relevant scopes.
4. Install the app to your workspace and copy the Bot Token & Signing Secret into `.env`.

### Gmail polling (stub)

The Gmail connector currently logs polling requests and expects future integration with the Gmail API. The parser utility is fully implemented so payloads returned from Gmail can be normalized immediately.

### Admin approvals UI

Open `http://localhost:8000/admin` to review drafts awaiting approval. Approve to send via the appropriate connector (still honoring `DRY_RUN`), or reject to archive.

### Testing

```bash
pytest -q
```

Tests validate the policy gate edge cases and the LLM helper contract handling.

### Docker

```bash
docker compose up --build
```

The container ships with DRY_RUN enabled and exposes the FastAPI app on port 8000.

## Safe operations

- **Audit**: Every inbound message, draft, and send attempt is persisted with hashes for integrity.
- **Trace IDs**: Slack and Gmail metadata are tagged with trace identifiers to follow a conversation end-to-end.
- **Redaction**: Secrets in logs (tokens, keys) are automatically masked.
- **Manual overrides**: Flip `DRY_RUN` in `.env` to `false` only after validating connectors in staging.

## Limitations & future work

- Gmail poller currently stubs the upstream API call.
- Additional language support depends on fine-tuning the drafting prompt and templates.
- No background scheduler is included for polling; integrate with cron or a worker for production.

## Acceptance checklist

- [x] ✅ boots with Docker
- [x] ✅ creates DB, runs migrations automatically
- [x] ✅ Slack event signature verified
- [x] ✅ LLM calls behind a small wrapper with retries and timeout
- [x] ✅ DRY_RUN on by default; flip in .env
- [x] ✅ unit tests pass (pytest -q)
