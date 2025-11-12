# ASCII Diagrams

## System Overview
```
Cloud/Region
  |  +----------------------+    +------------------+
  |  | Global Orchestrator |<---| Fleet Data Lake  |
  |  +----------------------+    +------------------+
  |             ^                        ^
  |             | control & KPIs         | telemetry sync
  v             |                         |
+---------------------------+
|        Edge Box           |
| +---------------+         |
| | Orchestrator |<------+. |
| +---------------+      | |
|        |               | |
|        v               | |
| +---------------+      | |
| | SafetyPolicy |<----+ | |
| +---------------+    | | |
|        |            | | |
|        v            | | |
| +---------------+   | | |
| | Telemetry GW  |---+ | |
| +---------------+     | |
|        |              | |
|        v              | |
| +---------------+     | |
| |   OTA Agent   |<----+ |
| +---------------+       |
+-------------------------+
           |
           v
       Robots Fleet
```

## Dataflow
```
[Task Request] -> Orchestrator -> Safety Check -> Permit -> MQTT Command -> Robot
Robot -> Telemetry Gateway -> Local Store -> Batch Upload -> Cloud
OTA Repo -> OTA Agent -> Staged Deploy -> Health Status -> Orchestrator
Alerts -> Safety Policy -> Orchestrator Pause -> Operator Response
```

## Topic Map
```
site/{SITE_ID}/command/vda5050
site/{SITE_ID}/command/policy/{robot_id}
site/{SITE_ID}/telemetry/robot/{robot_id}
site/{SITE_ID}/telemetry/aggregate
site/{SITE_ID}/event/alert
site/{SITE_ID}/facility/door/{door_id}
site/{SITE_ID}/facility/elevator/{elevator_id}
site/{SITE_ID}/skill/{skill}/result
site/{SITE_ID}/ota/announcement
```

## OTA Rings
```
[Canary 1%] -> [Pilot 9%] -> [Main 90%]
   | Health OK? yes -> promote
   | no -> rollback to previous version
Rollback path: Main -> Pilot -> Canary -> Last Known Good
```

## Incident Flow
```
Alert Raised -> Telemetry Gateway tags event -> Orchestrator pauses tasks
    -> Safety Policy issues throttles -> Operator notified ->
    -> Root cause analysis using MCAP logs -> Mitigation applied ->
    -> Resume operations after audit sign-off
```

