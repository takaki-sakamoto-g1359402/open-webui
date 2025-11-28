import numpy as np

from qnet.network import QuantumNetwork, QNode, QLink
from qnet.tasks import remote_cz_gate
from qnet.scheduler import plan_route
from qnet.entanglement import EntanglementParams


def build_net():
    net = QuantumNetwork()
    for n in ["A", "B", "C", "SAT"]:
        net.add_node(QNode(n, "module", 8, (0, 0)))
    net.add_link(QLink("A", "B", "fiber", 200, 0.5, 0.9, 20, 0.05))
    net.add_link(QLink("B", "C", "fiber", 200, 0.5, 0.9, 20, 0.05))
    net.add_link(QLink("A", "SAT", "satellite", 600, 0.6, 0.85, 40, 0.1))
    net.add_link(QLink("SAT", "C", "satellite", 600, 0.6, 0.85, 40, 0.1))
    return net


def test_scheduler_prefers_satellite_when_fiber_low_fidelity():
    net = build_net()
    task = remote_cz_gate()
    task.payload = {"src": "A", "dst": "C"}
    params = EntanglementParams()
    plan = plan_route(task, net, params, allow_satellite=True)
    assert plan.via in {"satellite", "mixed"}
