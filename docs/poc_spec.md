# PoC SPEC

## 1. Problem Statement
- Deliver ultra-scalable control space coordinating tens of millions of humanoid robots with hierarchical autonomy.
- Guarantee safety, resiliency, and observability across robot, edge, and regional tiers while minimizing bandwidth and enabling rapid OTA updates.

## 2. Assumptions
- Robots expose deterministic control loops at 1 kHz–100 Hz and accept VDA5050 command envelopes.
- Edge nodes ("Edge Boxes") are single-tenant, ruggedized servers with reliable 10–50 ms latency to robots and intermittent WAN.
- Region/cloud orchestrator available with >1 s latency and eventual consistency.
- MQTT broker available per site; MCAP used for structured telemetry export.
- All services deploy via containers; Linux-based systems; Python 3.11 runtime for PoC.
- Safety policy service authoritative for motion permits; all task execution requires clearance tokens.

## 3. Risks
- WAN outage causing backlog of telemetry/commands (mitigated by edge-first autonomy & store-and-forward).
- Malicious or faulty OTA payload (mitigated by signed packages, staged rollout, health monitoring).
- Sensor spoofing or degraded perception leading to unsafe motion (mitigated by local safety envelopes and watchdogs).
- Clock drift between robots and edge (mitigated by PTP/NTP time sync note and monotonic timers).
- Policy misconfiguration (mitigated by declarative templates, validation, audit trail).

## 4. Architecture Overview
```
+--------------------------- Cloud / Region (>1 s) ---------------------------+
|  Global Orchestrator  |  Safety Governance  |  Fleet Data Lake | OTA Repo  |
|            ^               ^                     ^                 ^        |
|            | control rings | policy updates      | telemetry sync   |        |
+------------|---------------|---------------------|------------------|--------+
             |               |                     |                   
             v               v                     v
+----------------------------- Edge (10–50 ms) --------------------------------+
|  Orchestrator (8080) <-> Safety Policy (8083) <-> Telemetry Gateway (8081) |
|        |                    |                            |                   |
|        v                    |                            v                   |
|     OTA Agent (8082)  <-- health/status -->    Local Store + MQTT Broker     |
+-----------------------------+-------------------------+----------------------+ 
                              |                         
                              v                         
+--------------------------- Robots (kHz–100 Hz) --------------------------------+
|  Humanoid robots run local control, subscribe to site/{SITE_ID}/command/#,     |
|  publish status to site/{SITE_ID}/status/#, execute safety tokens locally.     |
+--------------------------------------------------------------------------------+
```

Dataflows:
1. Tasks enter edge orchestrator via API/MQTT, validated by safety policy.
2. Robots send telemetry to telemetry gateway; sampling rules applied; stored locally and batched to cloud.
3. OTA agent coordinates staged updates, interacts with orchestrator for drain, uses safety policy for go/no-go.
4. Cloud orchestrator only sees aggregated metrics and commands via control rings.

## 5. Topic & Schema Design
- MQTT topics (prefix `site/{SITE_ID}/`):
  - `site/{SITE_ID}/command/vda5050` (JSON VDA5050 mission messages).
  - `site/{SITE_ID}/telemetry/robot/{robot_id}` (steady-state telemetry JSON).
  - `site/{SITE_ID}/event/alert` (exception high-priority alerts).
  - `site/{SITE_ID}/ota/announcement` (OTA stage notifications).
- MCAP schemas (namespace `telemetry.v1.*`):
  - `telemetry.v1.RobotState`: robot_id, pose, battery, mode, safety_token, timestamp.
  - `telemetry.v1.TaskMetric`: task_id, robot_id, latency_ms, result, near_miss (bool), timestamp.
  - `telemetry.v1.NetworkStat`: link_name, uplink_bps, downlink_bps, packet_loss, timestamp.
- Example message (JSON/MCAP payload as JSON representation):
```json
{
  "schema": "telemetry.v1.RobotState",
  "data": {
    "robot_id": "R-1234",
    "pose": {"x": 1.2, "y": 3.4, "theta": 0.5},
    "battery": 78.5,
    "mode": "AUTO",
    "safety_token": "permit-456",
    "timestamp": "2025-05-01T12:00:00.123Z"
  }
}
```

## 6. Telemetry Budget & Sampling Rules
- Steady-state sampling:
  - RobotState: 1 Hz steady stream per robot; downsample battery to 0.2 Hz.
  - TaskMetric: emit on task completion; aggregated histogram every 60 s.
  - NetworkStat: 0.5 Hz per interface.
- Exception sampling:
  - Near misses, safety envelope breaches: immediate publish on `event/alert` with retry until ack.
  - Telemetry burst limit 64 kbps per robot; telemetry gateway enforces by dropping non-critical fields.
- Telemetry gateway batches 5-second windows for WAN upload; MCAP files rotated every 15 minutes or 50 MB.

## 7. OTA Strategy
- Rings: `RING_CANARY` (1%), `RING_PILOT` (9%), `RING_MAIN` (90%).
- Process:
  1. OTA agent fetches signed package manifest from cloud when orchestrator indicates idle window.
  2. Deploy to canary robots; monitor KPIs for 30 minutes.
  3. Promote to pilot ring; require safety policy approval before entering main ring.
  4. Rollback triggered automatically if health check fails, KPIs degrade >10%, or safety policy revokes permit.
- Rollback uses dual-partition images; OTA agent retains last known-good digest.

## 8. KPIs & SLOs
- Safety: zero uncontrolled motion events (SLO: 0 incidents/month), near_miss_rate ≤ 1e-4 per task (99p).
- Task latency: task_latency_ms_p50 ≤ 2500 ms; task_latency_ms_p99 ≤ 8000 ms.
- Operations: OTA success rate ≥ 99.5%, rollback success 100%.
- Network: ingest_bps average ≤ 10 Mbps/site, 99p ≤ 20 Mbps.
- Quality: mission success ≥ 99%, replan_rate ≤ 3%.
- Cost: edge CPU utilization ≤ 60% avg, storage cost ≤ $0.02/task (modeled).

## 9. Runbook Summary
- Start: ensure `.env` loaded, run `docker-compose up -d`; verify services healthy (`curl /healthz`).
- Stop: `docker-compose down`; archive MCAP logs from `var/mcap/`.
- Incident flow: on alert, pause new tasks, collect MCAP segment, escalate to regional SRE, apply mitigation via safety policy override.
- Audit trail: orchestrator logs tasks with permit tokens; OTA agent logs manifest digests; telemetry gateway logs sampling actions; all logs stored in JSON lines with ISO timestamps.

