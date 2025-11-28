from qnet.orchestrator import Orchestrator
from qnet.entanglement import EntanglementParams
from qnet.tasks import remote_cz_gate
from qnet.cli import build_demo_network


def test_orchestrator_runs_with_retry():
    net = build_demo_network()
    orch = Orchestrator(net, EntanglementParams(max_attempts=3))
    task = remote_cz_gate()
    task.payload = {"src": "A", "dst": "E"}
    report = orch.run_task(task)
    assert report.strategy in {"sequential", "parallel", "mpses"}
