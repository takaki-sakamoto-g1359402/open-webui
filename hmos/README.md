# HybridMind OS (HM-OS) MVP

HM-OS is a local-first orchestration execution OS that treats AI as the "brain", events as the "nervous system", and connectors as the "body". This MVP is safety-first and governance-heavy by design.

## Quickstart

```bash
cd hmos
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Run a goal (local-only):

```bash
hmos run --goal "Check status and summarize"
```

Run the API (binds to 127.0.0.1 by default):

```bash
hmos serve
```

Optional local API token:

```bash
export HMOS_API_TOKEN=localtoken
```

## Governance Overview

- **Risk0**: read-only; no approval required
- **Risk1**: internal state changes; no approval required
- **Risk2**: external side effects; approval required
- **Risk3**: disallowed in MVP

Audit events are hash-chained with deterministic canonical JSON serialization. External HTTP calls require an allowlisted host and an idempotency key.

See [docs/governance.md](docs/governance.md) for more detail.

## Example Apps

- **Ops Assistant** (Risk0/Risk1 only): use `hmos run --goal "Check status and summarize"` to run a safe plan.
- **Automation Runner** (Risk2 approval gate): use a goal containing `automation` to add a Risk2 step, then approve it via the API:

```bash
hmos run --goal "automation: post to allowlisted api"
# find the step id and approve it
curl -X POST http://127.0.0.1:8765/approvals/<STEP_ID>
```

## Documentation

- [Architecture](docs/architecture.md)
- [Governance Model](docs/governance.md)
- [Threat Model](docs/threat-model.md)
