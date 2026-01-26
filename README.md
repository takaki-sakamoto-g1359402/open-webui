# AI Orchestration System (Governed Autonomous Operations)

A production-lean orchestration loop that keeps a company running 24/7 while enforcing strict governance, controlled autonomy, and cryptographically verifiable approvals.

Core properties:
- **Permission levels (L0–L4)** with explicit external-impact boundaries.
- **Kill-switch + auto-stop** conditions when evidence is missing, conflicting, anomalous, or risky.
- **Structured audit logs** for every decision and tool call with masking + hashing.
- **CEO sleep mode** via an approval queue.
- **Approval Security Levels (ASL)** including a post-quantum–resilient approval artifact (ASL-3).

## Architecture Overview

Actors:
- **Human CEO**: final approval authority for high-risk actions.
- **AI Orchestrator (AIo)**: central controller.
- Specialist agents:
  - **AI1**: Sales/Marketing
  - **AI2**: Ops/Customer Support
  - **AI3**: Finance + Legal helper (**assist-only**, no legal conclusions)
  - **AI4**: Engineering/Automation

Flow:
1. Ingest events.
2. Classify risk and permission level.
3. Dispatch to agents with strict tool allowlists.
4. Evaluate policy + anomaly checks.
5. Execute, rollback/compensate, or escalate to approvals.
6. Persist audit logs + lessons learned.

## Repository Structure (Key Modules)

```text
app/
  main.py                  # FastAPI app + background orchestration loop
  orchestrator/engine.py   # Main loop, risk classification, kill-switches, execution
  agents/                  # AI1–AI4 agent specs + behaviors
  tools/                   # Tool registry + builtin tools (with rollback/post-checks)
  policy/engine.py         # Rule-based policy + explicit MVP anomaly detection
  storage/sqlite.py        # SQLite persistence + audit logging + masking/hashing
  security/                # Challenge issuance, ASL enforcement, OTP, PQC signer stub
  schemas/                 # Pydantic v2 schemas
  utils/                   # Redaction + structured logging

tests/
  test_governance.py
  test_security.py
```

---

## Permission Levels (L0–L4) and Boundaries

- **L0 Observe**: read/monitor only, no state changes.
- **L1 Propose**: drafts and plans only, no sending/publishing.
- **L2 Execute Low-Risk (INTERNAL ONLY)**:
  - Reversible and pre-approved internal actions only.
  - No external sending/publishing, no money movement, no irreversible actions.
- **L3 Execute Conditional (EXTERNAL IMPACT ALLOWED WITH SAFEGUARDS)**:
  - External actions allowed only when thresholds, policy rules, allowlists, rollback/compensation, and post-checks pass.
- **L4 High-Risk (ALWAYS CEO APPROVAL)**:
  - Money movement, contract signing, destructive irreversible actions, privilege changes, vendor onboarding, production data deletion.
  - Never executed autonomously.

### L2 internal-only boundary
L2 actions are blocked if they attempt external impact.

### L3 conditional external boundary
L3 actions are allowed only when policy + anomaly checks pass and rollback/compensating actions exist.

---

## Kill-Switch / Auto-Stop Rules (MVP)

Execution stops and escalates (or holds) when:
- Evidence is missing or references are unavailable.
- Conflicting evidence is detected.
- Anomalies are detected.
- Budget/margin thresholds are breached.
- Security alert or tool misuse is suspected.
- Sentiment / escalation triggers fire.
- Policy returns `requires_approval` and the CEO is unavailable.

### MVP anomaly detection thresholds (explicit rules)
Implemented as clear, non-magical thresholds:
- **Rate anomalies**: too many actions per window.
- **Financial anomalies**: amount above threshold or spike vs rolling average.
- **Comms anomalies**: repeated outbound content, unusual recipient domains.
- **Access anomalies**: tool use outside allowed times or suspicious workflow context.

---

## Approval Queue (“CEO Sleep Mode”)

High-risk actions (L4) are queued and held until the CEO approves/denies.

CEO actions supported:
- Approve/deny with reason.
- Request alternatives (modeled via denial + follow-up event).
- Temporary overrides can be modeled, but **L4 money movement/contract signing still requires explicit approval artifacts**.

---

## Approval Security Levels (ASL)

- **ASL-0**: disallowed (chat/email-only/password-only).
- **ASL-1**: passkey + biometric proof.
- **ASL-2**: ASL-1 + OTP.
- **ASL-3**: ASL-2 + PQC-signed approval artifact bound to a server challenge.
- **ASL-4**: optional “max mode”.

### ASL-3 Post-Quantum Approval Artifact
This MVP includes a PQC signing interface. The environment does not include ML-DSA/SLH-DSA libraries, so a clearly-documented **stub signer** is used while preserving the interface and verification flow. Replace `app/security/pqc.py` with a NIST-standardized PQC library in production.

---

## Configuration

Security settings come from environment variables (no hardcoded secrets):

```bash
export AIOS_DB_PATH="data/orchestrator.db"
export AIOS_WEBAUTHN_HMAC_KEY="<long-random-string>"
export AIOS_OTP_SECRET="<base32-secret>"
export AIOS_PQC_PRIVATE_KEY="<private-key-material>"
export AIOS_PQC_PUBLIC_KEY="<public-key-material>"
```

For convenience in local development, the app will generate ephemeral values if these are missing. Do not rely on that behavior in production.

See also: `example_config.yaml`.

---

## How to Run

### 1) Start the API

```bash
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8081
```

### 2) Check health

```bash
curl -s http://localhost:8081/health
```

---

## Demo Scenarios

All demo commands assume the server is running.

### Scenario 1: Customer complaint at night (sentiment risk)

AI2 drafts a response (L1) and AIo logs the flow.

```bash
curl -s http://localhost:8081/events \
  -H "content-type: application/json" \
  -d '{
    "event_type": "customer_complaint",
    "payload": {
      "message": "I am angry and want a refund",
      "complaint_signals": ["angry", "refund"],
      "sentiment_risk": true
    }
  }'
```

Because the kill-switch sees `sentiment_risk`, the task is held and escalated.

---

### Scenario 2: Invoice creation vs external reminder

Internal drafting is allowed; external sending is conditional.

```bash
curl -s http://localhost:8081/events \
  -H "content-type: application/json" \
  -d '{
    "event_type": "invoice_request",
    "payload": {
      "amount": 350,
      "currency": "USD",
      "recipient": "ap@example.com"
    }
  }'
```

To test conditional external messaging with rollback:

```bash
curl -s http://localhost:8081/events \
  -H "content-type: application/json" \
  -d '{
    "event_type": "external_outreach",
    "payload": {
      "lead": "HighRisk",
      "recipient": "ops@example.com",
      "send_external": true,
      "sentiment_score": -0.9,
      "message": "This is risky"
    }
  }'
```

The post-check fails on negative sentiment, triggering rollback/compensating action.

---

### Scenario 3: Sales lead enrichment (low risk)

```bash
curl -s http://localhost:8081/events \
  -H "content-type: application/json" \
  -d '{
    "event_type": "sales_lead",
    "payload": {
      "lead": "Taylor",
      "recipient": "taylor@example.com",
      "message": "Hello taylor@example.com"
    }
  }'
```

AI1 drafts outreach variations but only performs internal CRM updates at L2.

---

### Scenario 4: Tool misuse / suspicious instruction

```bash
curl -s http://localhost:8081/events \
  -H "content-type: application/json" \
  -d '{
    "event_type": "suspicious_instruction",
    "payload": {
      "security_alert": true,
      "missing_evidence": true
    }
  }'
```

The kill-switch escalates immediately and logs the reasons.

---

### Scenario 5: L4 money movement with ASL-3 approval

#### Step A: Create the request

```bash
curl -s http://localhost:8081/events \
  -H "content-type: application/json" \
  -d '{
    "event_type": "money_movement",
    "payload": {
      "amount": 2500,
      "currency": "USD",
      "recipient": "ceo@example.com"
    }
  }'
```

#### Step B: Find the pending approval

```bash
curl -s http://localhost:8081/approvals
```

#### Step C: Issue a server challenge

```bash
curl -s -X POST "http://localhost:8081/approvals/<approval_id>/challenge?actor_id=ceo"
```

#### Step D: Approve (ASL-3)

In production, the CEO device would generate real WebAuthn + OTP + PQC signatures. For this MVP, use the CLI to simulate a full ASL-3 approval:

```bash
PYTHONPATH=. python -m app.utils.cli approve --approval-id <approval_id> --actor-id ceo --reason "approved"
```

---

## “CEO Asleep Mode” Simulation

This system already operates in “CEO asleep mode” by default: L4 actions are held in the approval queue.

To simulate it:
1. Inject an L4 event (e.g., `money_movement`).
2. Observe `awaiting_approval` tasks.
3. Approve later via API or CLI.

---

## Querying Audit Logs

Audit logs are trace-correlated:

```bash
curl -s "http://localhost:8081/audit?trace_id=<trace_id>"
```

Audit entries include actor, level, structured inputs/outputs, evidence references, and policy outcomes.

---

## Running Tests

The repository’s default pytest configuration targets a different test path. Run the orchestration tests explicitly:

```bash
PYTHONPATH=. pytest -q tests/test_governance.py tests/test_security.py
```

---

## Adding a New Agent

1. Add a handler in `app/agents/builtin.py` (or a new module).
2. Register it in `build_agents()` with:
   - Role description
   - Allowed tool allowlist
   - Default permission level
   - Assist-only constraints if applicable
3. Update `OrchestratorEngine._classify_event` to route events.
4. Add tests for tool boundaries and policy outcomes.

## Adding a New Tool

1. Implement the callable in `app/tools/`.
2. Register it via `ToolRegistry.register()` with:
   - Required permission level
   - `external_impact` flag
   - Optional rollback/compensating handler
   - Optional post-check function
3. Ensure policy rules cover the tool’s risk profile.
4. Add audit and governance tests.
