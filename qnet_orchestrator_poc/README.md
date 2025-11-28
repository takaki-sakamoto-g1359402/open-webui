# QNet-aware Hybrid AI Orchestrator PoC

A small, runnable simulator for exploring quantum networking orchestration choices.

## Features
- Quantum network model with fiber and satellite links, distance-aware loss and fidelity.
- Entanglement generation, swapping, and parallel segment swapping (PSES/M-PSES-like).
- Scheduler that weighs sequential vs PSES and fiber vs satellite fallback to satisfy task constraints.
- Plan-Act-Reflect orchestrator with retries.
- CLI demo comparing strategies.

## Quickstart
```bash
cd qnet_orchestrator_poc
python -m qnet.cli demo
```

## Tests
```bash
cd qnet_orchestrator_poc
pytest -q
```
