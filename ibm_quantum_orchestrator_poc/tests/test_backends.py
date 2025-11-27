import pytest

from ibm_quantum_orchestrator_poc.backends import SimulatedQuantumBackend
from ibm_quantum_orchestrator_poc.config import AccessConfig
from ibm_quantum_orchestrator_poc.models import PlanTier


def test_simulated_backend_portfolio():
    backend = SimulatedQuantumBackend(AccessConfig(plan=PlanTier.PREMIUM))
    payload = {"assets": ["a", "b"], "covariance": [[0.1, 0.2], [0.2, 0.3]]}
    result = backend.run_quantum_function("portfolio_optimization", payload)
    assert "weights" in result and "risk" in result


def test_simulated_backend_permission_error():
    backend = SimulatedQuantumBackend(AccessConfig(plan=PlanTier.STANDARD, enabled_functions=["vqe_ground_state_energy"]))
    with pytest.raises(PermissionError):
        backend.run_quantum_function("portfolio_optimization", {})
