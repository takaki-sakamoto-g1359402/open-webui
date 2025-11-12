# Lightweight Digital Twin Spec

## Formal Task/State Model
States:
- `IDLE`: Robot ready, no active task.
- `ASSIGNED`: Task allocated, waiting for safety permit.
- `EN_ROUTE`: Navigating to task start waypoint.
- `EXECUTING`: Performing manipulation/mission steps.
- `PAUSED`: Task paused due to safety/policy trigger.
- `COMPLETED`: Task finished successfully.
- `FAILED`: Task aborted; includes rollback or timeout.
- `SAFE_HALT`: Emergency stop engaged; requires manual reset.

Transitions (guards):
- `IDLE -> ASSIGNED`: guard `safety_token.valid && task_window.open`.
- `ASSIGNED -> EN_ROUTE`: guard `navigation_plan.confirmed`.
- `EN_ROUTE -> EXECUTING`: guard `arrival_within_tolerance && payload_ready`.
- `EXECUTING -> COMPLETED`: guard `all_steps_success && metrics.within_bounds`.
- `EXECUTING -> PAUSED`: guard `proximity_alert || operator_request`.
- `PAUSED -> EN_ROUTE`: guard `hazard_cleared && policy.resume_allowed`.
- `PAUSED -> SAFE_HALT`: guard `timeout_exceeded`.
- `EN_ROUTE/EXECUTING -> FAILED`: guard `critical_fault || policy.revoked`.
- `FAILED -> IDLE`: guard `recovery_plan.approved`.
- `SAFE_HALT -> IDLE`: guard `manual_reset && diagnostics_passed`.

## Constraint Model
- Spatial envelopes: keep-out zones defined by polygons per facility zone; clearance ≥ 0.5 m near humans, ≥ 0.2 m near robots.
- Velocity limits: max 1.5 m/s normal, 0.5 m/s when humans detected within 2 m; enforced via safety policy service throttle.
- Capacity: max 3 concurrent tasks per edge orchestrator; per-robot concurrency = 1.
- Zone rules: only robots with certification tag can enter `HAZMAT` zones; tasks require `permit_class` match to robot capability set.
- Time windows: tasks specify `start_after` and `finish_before`; orchestrator ensures schedule within window.

## Cost Functions
- Assignment score = `w1 * travel_time + w2 * energy_cost + w3 * policy_penalty + w4 * kpi_deviation`.
  - Defaults: `w1=0.4`, `w2=0.2`, `w3=0.25`, `w4=0.15`.
- Route selection cost = `alpha * path_length + beta * congestion_index + gamma * risk_score` with `alpha=1`, `beta=2`, `gamma=3`.
- Safety override cost adds infinite penalty when constraints violated to force rejection.

## Update/Observation Interface
- Subscriptions:
  - `site/{SITE_ID}/telemetry/robot/{robot_id}` → update `RobotState` with timestamped pose, battery, mode.
  - `site/{SITE_ID}/event/alert` → trigger state transitions to `PAUSED` or `SAFE_HALT`.
- Publications:
  - `site/{SITE_ID}/command/vda5050` → issue mission updates.
  - `site/{SITE_ID}/command/policy/{robot_id}` → publish throttle overrides from safety policy service.
- API contracts:
  - Orchestrator `/tasks` POST requires payload including `task_id`, `mission`, `constraints` (zones, time windows), `kpi_targets`.
  - Telemetry gateway `/mcap/upload` PUT accepts MCAP bundle metadata (filename, sha256, size_bytes).
- Observation update frequency aligns with telemetry sampling: 1 Hz updates, event-driven exceptions.

