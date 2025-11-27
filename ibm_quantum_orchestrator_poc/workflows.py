from __future__ import annotations

import math
import random
from typing import Dict, List

from .models import ClassicalStep, HybridJob, QuantumStep


def build_portfolio_workflow(num_assets: int = 4, seed: int = 7) -> HybridJob:
    random.seed(seed)
    assets = [f"Asset-{i}" for i in range(num_assets)]
    covariance = [[round(random.random(), 3) for _ in assets] for _ in assets]

    def classical_pre(_: Dict) -> Dict:
        return {"assets": assets, "covariance": covariance, "seed": seed}

    def quantum_payload(context: Dict) -> Dict:
        return {"assets": context["assets"], "covariance": context["covariance"], "seed": context.get("seed", seed)}

    def classical_post(context: Dict) -> Dict:
        weights = context.get("weights", {})
        ordered = {assets[int(idx)]: weight for idx, weight in weights.items()}
        return {"allocation": ordered}

    job = HybridJob(name="portfolio_optimization")
    job.add_step(ClassicalStep("generate_assets", classical_pre))
    job.add_step(QuantumStep("optimize_portfolio", "portfolio_optimization", quantum_payload))
    job.add_step(ClassicalStep("interpret_results", classical_post))
    return job


def build_vqe_workflow(iterations: int = 3, seed: int = 42) -> HybridJob:
    def classical_pre(_: Dict) -> Dict:
        # Simple harmonic oscillator energies as a stand-in for Hamiltonian parameters
        params = [round(math.sin(i), 3) for i in range(iterations)]
        return {"params": params, "iterations": iterations, "seed": seed}

    def quantum_payload(context: Dict) -> Dict:
        return {"params": context["params"], "iterations": context["iterations"], "seed": context.get("seed", seed)}

    def classical_post(context: Dict) -> Dict:
        energies = context.get("energies", [])
        if not energies:
            return {"trend": "no data"}
        trend = "decreasing" if energies == sorted(energies, reverse=True) else "variable"
        return {"trend": trend}

    job = HybridJob(name="vqe_ground_state_energy")
    job.add_step(ClassicalStep("prepare_hamiltonian", classical_pre))
    job.add_step(QuantumStep("run_vqe", "vqe_ground_state_energy", quantum_payload))
    job.add_step(ClassicalStep("analyze_energy", classical_post))
    return job


WORKFLOWS = {
    "portfolio": build_portfolio_workflow,
    "vqe": build_vqe_workflow,
}
