# Safety Case Starter (UL 4600 Style)

## Safety Goals
1. Prevent uncontrolled motion causing harm to humans or assets.
2. Maintain safe stopping capability within defined safety envelope.
3. Ensure OTA updates do not introduce unacceptable safety regressions.
4. Guarantee traceability of tasks, policies, and operator actions.

## Hazards & Mitigations
- H1: Human detected inside restricted zone during robot motion.
  - Mitigations: Redundant perception; safety policy throttle; emergency stop; zone clearance verification.
- H2: Loss of communications between robot and edge orchestrator.
  - Mitigations: Robot local fail-safe behaviors, watchdog timeout triggering SAFE_HALT, telemetry gateway alert.
- H3: Corrupted OTA package leading to unsafe software.
  - Mitigations: Signed manifests, staged rollout, post-update health check, automatic rollback.
- H4: Policy misconfiguration allowing unsafe task assignment.
  - Mitigations: Policy validation, change approval workflow, audit logging, simulation rehearsal using digital twin.
- H5: Sensor spoofing causing false safe state.
  - Mitigations: Multi-sensor fusion, plausibility checks, anomaly detection thresholds.

## Argument Structure
- Claim: "Edge box maintains robot operations within validated safety envelope."
  - Context: ISO 10218/13482 requirements, site configuration documents.
  - Strategy: Combine design assurance, operational monitoring, and governance controls.
  - Evidence:
    - Design artifacts: architecture spec, safety policy definitions.
    - Verification: integration test results, OTA canary reports.
    - Operational: telemetry KPIs, incident logs, audit trails.
- Claim: "OTA process preserves functional safety."
  - Strategy: Show compliance with staged deployment, health monitoring, rollback.
  - Evidence: OTA manifests, test coverage reports, signed approvals.

## Required Evidence List
- Edge service source control history & code reviews.
- Safety policy configuration baselines (hash + approver signature).
- MCAP telemetry extracts (RobotState, TaskMetric) demonstrating KPI compliance.
- OTA ring promotion logs and success/failure statistics.
- Incident response records with resolution outcome.

## Operational Policies
- Human–robot proximity: maintain 0.5 m clearance; activate slow zone when human within 2 m; log event in telemetry gateway.
- Emergency stop: hardware E-stop integrated with robots; orchestrator respects `SAFE_HALT` state; manual reset required.
- Degraded modes: on sensor failure, robot transitions to `FAILED`, enters `SAFE_HALT`, orchestrator blocks new tasks until diagnostics pass.
- Audit logging: all API calls log user, timestamp, payload digest; logs stored 365 days; tamper-evident via hash chain.

