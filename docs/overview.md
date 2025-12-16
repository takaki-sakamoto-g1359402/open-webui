# Humanoid Fleet Management — Overview

This proof-of-concept demonstrates a minimal **V→R→V loop** for humanoid fleets. The digital twin (`V`) generates plans, the real world (`R`) executes through an adapter, and telemetry updates the twin for continuous improvement.

```
+-----------+      +-----------+      +-----------+
| Planner   |----->| Adapter   |----->| Real R    |
+-----------+      +-----------+      +-----------+
      ^                   |                  |
      |                   v                  v
+-----------+      +-----------+      +-----------+
| Optimizer |<-----| Telemetry |<-----| Virtual V |
+-----------+      +-----------+      +-----------+
```

## Components

- **VirtualEnv (`sim_v/env.py`)**: lightweight digital twin holding robot states and parameters.
- **Planner (`fleet_core/planning.py`)**: proposes `ActionPlan` instances per cycle.
- **Adapter (`real_r/adapters/`)**: hardware-agnostic boundary that receives plans and returns `Telemetry`.
- **Optimizer (`fleet_core/optimization.py`)**: tunes planner parameters based on outcomes.
- **Orchestrator (`fleet_core/orchestrator.py`)**: drives the loop and handles logging.

## Extending to space-age scenarios

- Add new adapters to integrate ROS2, lunar-gravity controllers, or asteroid resource models.
- Expand `EnvironmentMetadata` to capture atmosphere, radiation, or regolith stability.
- Replace the planner/optimizer with learning-based modules while keeping the same typed interfaces.
- Enforce safety and policy checks in `approve_plan` before dispatching to hardware.
