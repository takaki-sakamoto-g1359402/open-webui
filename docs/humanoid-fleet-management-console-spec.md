# Humanoid Fleet Management Console — UI/UX Specification (Safety-Critical Ops)

This specification is implementation-oriented and prioritizes safety, reversibility, accountability, and low cognitive load in fleet management operations. Third-party harm is treated as a first-class risk.

---

## A) System Overview

### Roles & Responsibilities
- **Operator**: Day-to-day monitoring, acknowledgments, low-risk interventions, teleassist within guardrails.
- **Supervisor**: Approves risky actions, overrides automation, manages escalations.
- **Safety Officer**: Defines safety policies, emergency procedures, and audit requirements.
- **Admin**: RBAC, keys, OTA updates, system configuration, retention policies.

### Trust Boundaries & Critical Actions
- **Trust boundaries**
  - Operator UI ↔ Backend (auth, authorization, audit logging)
  - Backend ↔ Robot Agents (command/control, telemetry)
  - External systems (building access, video storage, SSO)
- **Critical actions**
  - Enter restricted zones, door manipulation, proximity to humans, recording toggles, firmware updates, mission overrides, disabling safety constraints.

### High-Level Architecture
- **Front-End (Desktop-first web app)**
  - React/Vue + real-time event streams (WebSocket/GRPC-Web).
  - Local optimistic cache with conflict resolution.
- **Backend**
  - Command Gateway (RBAC enforcement, approval gating)
  - Telemetry Ingest (schema validation, de-duplication)
  - Event Bus (Kafka/NATS) for alerts, audit, missions
  - Policy Engine (risk scoring, gating, safe defaults)
  - Audit Service (immutable log + replay index)
- **Robot Agents**
  - Local safety controller, store-and-forward telemetry, degrade mode
- **Data stores**
  - Time-series for telemetry, object storage for video, immutable append-only audit log

---

## B) UI Decomposition (Screens & Components)

Each screen follows “summary by default, drill-down on demand.”

### 1) Fleet Roster (List/Cards)
- **Primary goals**: Quickly assess fleet health, availability, and active risks.
- **Key components**
  - Status cards with health, mission state, last-seen
  - Filters: status, location, risk level, connectivity
  - Summary counters (Normal/Degraded/Intervention/Fault/Emergency)
- **Critical interactions**
  - Select robot → open detail drawer
  - Batch action: “Safe Stop” (requires supervisor if >P2 risk)
- **Safe defaults & failure states**
  - Default sort: Highest risk first
  - If telemetry stale, show “Unknown” and disable risky actions

### 2) Map / Facility View (2D/3D + Zones)
- **Primary goals**: Spatial situational awareness and conflict detection.
- **Key components**
  - Zone overlays (restricted/sensitive/public)
  - Live robot positions + confidence halo
  - Route previews with risk annotations
- **Critical interactions**
  - Click robot → path history + planned path
  - Draw “temporary no-go zone” (requires supervisor)
- **Safe defaults & failure states**
  - If localization uncertain: robot shown in uncertainty bubble; route planning disabled

### 3) Mission Planner + Queue
- **Primary goals**: Create, schedule, and prioritize missions safely.
- **Key components**
  - Mission templates with risk rating and required approvals
  - Queue with priority, dependencies, and rollback status
- **Critical interactions**
  - Submit mission → approval dialog if risky
  - “Dry-run” simulation with estimated outcomes
- **Safe defaults & failure states**
  - Default: simulate before execute
  - If any dependency unavailable → block execution

### 4) Teleoperation / Assist
- **Primary goals**: Safe low-speed assist under constraints.
- **Key components**
  - Video feed + sensor overlays + speed limiter
  - “Constraint bubble” and collision warnings
- **Critical interactions**
  - Enable teleassist (Supervisor approval if >P2 risk)
  - “Release control” with auto-pause
- **Safe defaults & failure states**
  - Always low-speed mode on entry
  - On high latency: forced safe stop

### 5) Alerts & Runbooks (P0–P3)
- **Primary goals**: Triage, resolve, and prevent alert fatigue.
- **Key components**
  - Priority lanes (P0–P3), dedup stack, “suggested action” panel
- **Critical interactions**
  - Acknowledge → Assign → Resolve → Post-mortem tag
- **Safe defaults & failure states**
  - P0 cannot be muted; requires explicit assignment

### 6) Audit Log + Replay
- **Primary goals**: Accountability, traceability, incident replay.
- **Key components**
  - Timeline with event diffs, approvals, and media snippets
  - Filter by robot, action, user, or policy
- **Critical interactions**
  - “Replay mission” with state-diff overlay
- **Safe defaults & failure states**
  - Immutable log; missing media shows hashed placeholder

### 7) Admin/Security
- **Primary goals**: RBAC management, policy updates, OTA control.
- **Key components**
  - Role editor, policy diff viewer, key rotation panel
- **Critical interactions**
  - Deploy policy with canary/rollback
- **Safe defaults & failure states**
  - All updates require staged rollout + audit entry

---

## C) Operational Modes & State Machine

### Modes
- **Normal**: All systems healthy; normal automation.
- **Degraded**: Partial sensor or network loss; reduced autonomy.
- **Intervention**: Human is actively controlling/approving.
- **Fault**: Safety thresholds violated; actions blocked.
- **Emergency**: E-stop state; all motion halted.

### Entry/Exit Conditions
- **Normal → Degraded**: Loss of critical sensor, low confidence, unstable connectivity.
- **Degraded → Intervention**: Human takeover or risky action approval.
- **Fault**: Collision risk, safety controller override, or policy violation.
- **Emergency**: Manual E-stop or P0 hazard.

### UI Changes Per Mode
- **Degraded**: Yellow banner + restricted action set.
- **Intervention**: Red guardrails, explicit operator-in-control badge.
- **Fault/Emergency**: Full-screen modal, “Safe Stop” commands only.

### E-Stop Behavior & Recovery
- **E-stop**: Immediate halt, disable motion commands, log cause.
- **Recovery steps**
  1. Safety Officer review.
  2. Diagnostics checklist.
  3. Supervisor approves restart.

---

## D) Alert Policy Design

### P0–P3 Definitions
- **P0**: Immediate harm risk (collision imminent, unauthorized entry).
- **P1**: High risk + time-sensitive (sensor failure near humans).
- **P2**: Operational risk (task stuck, degraded localization).
- **P3**: Informational (minor drift, delayed telemetry).

### Deduplication Rules
- Same robot + same root cause + 5-minute window → stack.
- Escalate if frequency exceeds threshold.

### Escalation Paths
- **P0** → Supervisor + Safety Officer (push + SMS).
- **P1** → Supervisor.
- **P2/P3** → Operator.

### Acknowledge/Resolve Flow
1. Acknowledge with intent (e.g., “Investigating”).
2. Assign owner.
3. Resolve with outcome and rollback status.

---

## E) Risky Action Gating

### Risky Action Examples
- Door manipulation, entering restricted zones, approaching humans, enabling recording, disabling safety constraints, OTA firmware.

### Approval Dialog Requirements
- **Context panel**
  - Confidence score, last 10 actions, local map, live camera
  - Expected outcome + rollback plan
- **Two-step confirmation**
  - Step 1: Summary + risk
  - Step 2: Explicit “I approve” with reason

### Role-Based Permissions
- **Operator**: low-risk actions only.
- **Supervisor**: risky actions with audit.
- **Safety Officer**: policy overrides, E-stop recovery.

---

## F) Telemetry + Uncertainty UX

### Displaying Confidence
- Confidence halos on map.
- Percentages only on drill-down.
- “Low confidence” badge on robot cards.

### Forced Escalation
- If confidence < threshold for >30s → degrade mode + P1 alert.

### Metrics: Default vs Drill-down
- **Default**: health, last-seen, mission status, confidence.
- **Drill-down**: sensor reliability, per-module error rates.

---

## G) Metrics & Success Criteria

### Safety
- Incidents, near-misses, privacy events.

### Reliability
- Uptime, MTTR, intervention minutes per robot-hour.

### Operator Load
- Max robots supervised, alert acknowledgment time.

### Trust
- User-reported confidence, override frequency, rollback frequency.

---

## H) Self-Improving UI/UX Loop (Safe Improvement)

### Instrumentation
- Events: `alert_ack`, `action_approved`, `safe_stop`, `mission_rollback`, `teleop_start`.
- Funnel for mission creation → approval → completion.

### Experiments
- Canary releases per role/segment.
- Bandit testing only for non-safety UI copy.

### Change Budget
- Auto-optimize: layout and labeling.
- Manual review: anything affecting gating/approval.

### Auto-rollback Triggers
- Spike in P0/P1 alerts, increased rollback frequency, higher intervention minutes.

---

## Top Risks & Mitigations
- **Network loss causing stale decisions** → Degrade mode + disable risky actions.
- **Operator overload / alert fatigue** → Dedup + priority lanes + runbooks.
- **Unauthorized actions** → RBAC + multi-step approval + audit.

---

## MVP in 2 Weeks (Safety-First Minimal Set)
- **Screens**: Fleet Roster, Alerts & Runbooks, Audit Log, Mission Planner (basic).
- **Policies**: RBAC, risky-action gating, safe-stop fallback, audit logging.
- **Telemetry**: Health status, last-seen, confidence levels.
- **Alerts**: P0–P2 with dedup + escalation rules.
- **Audit**: Immutable timeline with approvals and actions.
