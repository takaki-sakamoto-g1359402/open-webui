from __future__ import annotations

import argparse
import json
import logging
from typing import Any, Dict

from .backends import MockIBMQuantumBackend, QuantumBackend, SimulatedQuantumBackend
from .config import AccessConfig
from .orchestrator import HybridOrchestrator
from .workflows import WORKFLOWS

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="IBM Quantum Hybrid Orchestrator PoC")
    parser.add_argument("--workflow", choices=WORKFLOWS.keys(), default="portfolio")
    parser.add_argument("--backend", choices=["simulated", "mock_ibm"], default="simulated")
    parser.add_argument("--config", help="Path to JSON or YAML config file", default=None)
    parser.add_argument("--retries", type=int, default=1, help="Quantum step retry count")
    return parser.parse_args()


def build_backend(name: str, access_config: AccessConfig) -> QuantumBackend:
    if name == "simulated":
        return SimulatedQuantumBackend(access_config)
    if name == "mock_ibm":
        return MockIBMQuantumBackend(access_config)
    raise ValueError(f"Unsupported backend: {name}")


def main() -> None:
    args = parse_args()
    access_config = AccessConfig.load(args.config)
    backend = build_backend(args.backend, access_config)
    workflow_builder = WORKFLOWS[args.workflow]
    job = workflow_builder()
    orchestrator = HybridOrchestrator(backend, max_quantum_retries=args.retries)
    results = orchestrator.run(job)

    output: Dict[str, Any] = {r.step_name: r.output for r in results}
    print(json.dumps({"job": job.name, "success": all(r.success for r in results), "results": output}, indent=2))


if __name__ == "__main__":
    main()
