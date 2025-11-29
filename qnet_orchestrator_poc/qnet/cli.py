"""CLI demo for the orchestrator."""

from __future__ import annotations

import argparse
import numpy as np

from .network import QuantumNetwork, QNode, QLink
from .tasks import remote_cz_gate, distributed_grover_small
from .entanglement import EntanglementParams, sequential_swapping, parallel_segment_swapping
from .scheduler import plan_route, execute_plan


def build_demo_network() -> QuantumNetwork:
    net = QuantumNetwork()
    for i, city in enumerate(["A", "B", "C", "D", "E", "SAT"]):
        net.add_node(QNode(city, "module", memory_qubits=16, location_xy=(i * 10, 0)))
    # long fiber chain
    net.add_link(QLink("A", "B", "fiber", 100, 0.7, 0.95, 20, 0.05))
    net.add_link(QLink("B", "C", "fiber", 120, 0.65, 0.93, 25, 0.05))
    net.add_link(QLink("C", "D", "fiber", 150, 0.6, 0.92, 30, 0.05))
    net.add_link(QLink("D", "E", "fiber", 110, 0.7, 0.94, 22, 0.05))
    # satellite shortcuts A-E and B-SAT-E
    net.add_link(QLink("A", "SAT", "satellite", 600, 0.55, 0.85, 40, 0.1))
    net.add_link(QLink("SAT", "E", "satellite", 600, 0.55, 0.85, 40, 0.1))
    return net


def run_demo() -> None:
    net = build_demo_network()
    params = EntanglementParams()
    tasks = [remote_cz_gate(), distributed_grover_small()]
    rng = np.random.default_rng(1234)
    print(net.visualize_text())
    for task in tasks:
        task.payload = {"src": "A", "dst": "E"}
        print(f"\nTask {task.task_id} ({task.kind}) requirements: ebits={task.required_ebits}, fidelity>={task.fidelity_threshold}")
        # compare sequential vs PSES on fiber path
        fiber_path = net.compute_shortest_path("A", "E", kind_filter="fiber")
        seq_res = sequential_swapping(fiber_path, params, rng)
        par_res = parallel_segment_swapping(fiber_path.copy(), params, rng)
        print("Fiber path metrics:")
        print(f"  Sequential: attempts={seq_res['attempts']}, fidelity={seq_res.get('fidelity',0):.3f}, latency={seq_res.get('latency_ms',0):.1f}ms")
        print(f"  PSES:       attempts={par_res['attempts']}, fidelity={par_res.get('fidelity',0):.3f}, latency={par_res.get('latency_ms',0):.1f}ms")
        plan = plan_route(task, net, params, allow_satellite=True)
        exec_report = execute_plan(plan, task, rng, params)
        print(f"Selected plan: strategy={plan.strategy}, via={plan.via}, expected latency={plan.expected_latency:.1f}ms")
        print(
            f"Execution: success={exec_report.success}, fidelity={exec_report.fidelity:.3f}, latency={exec_report.latency_ms:.1f}ms, attempts={exec_report.attempts}"
        )


def main():
    parser = argparse.ArgumentParser(description="QNet Orchestrator PoC")
    parser.add_argument("command", choices=["demo"], help="Run demo")
    args = parser.parse_args()
    if args.command == "demo":
        run_demo()


if __name__ == "__main__":
    main()
