from ibm_quantum_orchestrator_poc.backends import SimulatedQuantumBackend
from ibm_quantum_orchestrator_poc.config import AccessConfig
from ibm_quantum_orchestrator_poc.orchestrator import HybridOrchestrator
from ibm_quantum_orchestrator_poc.workflows import build_portfolio_workflow


def test_orchestrator_happy_path():
    backend = SimulatedQuantumBackend(AccessConfig(enabled_functions=["portfolio_optimization"]))
    orchestrator = HybridOrchestrator(backend)
    job = build_portfolio_workflow(num_assets=2)
    results = orchestrator.run(job)
    assert all(r.success for r in results)
    assert "allocation" in results[-1].output


def test_orchestrator_handles_permission_error():
    backend = SimulatedQuantumBackend(AccessConfig(enabled_functions=[]))
    orchestrator = HybridOrchestrator(backend, max_quantum_retries=0)
    job = build_portfolio_workflow(num_assets=1)
    results = orchestrator.run(job)
    assert results[-1].success is False
    assert results[-1].error is not None
