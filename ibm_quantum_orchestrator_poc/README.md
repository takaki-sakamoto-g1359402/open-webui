# IBM Quantum Hybrid Orchestrator (PoC)

Small, runnable proof of concept that mirrors IBM's approach to orchestrating classical + quantum workloads using Qiskit Runtime / Functions. Everything runs locally with a simulated backend, but the code is structured so real IBM cloud SDK calls can be wired in later.

## Features
- Hybrid job model with classical + quantum steps.
- Quantum backend abstraction with a deterministic simulator and a mock IBM Runtime adapter stub.
- Simple orchestrator with logging, error handling, and optional retries for quantum steps.
- Example workflows (portfolio optimization, VQE-style energy estimation).
- Access configuration representing Standard vs Premium plans and per-function enablement.
- CLI for running workflows locally.
- Pytest-based unit tests.

## Install & Run
```bash
python -m pip install -r ibm_quantum_orchestrator_poc/requirements.txt  # pytest + optional PyYAML
python -m ibm_quantum_orchestrator_poc.cli --workflow portfolio --backend simulated
```

## Configuration
Create a JSON or YAML file with plan info:
```json
{
  "plan": "standard",
  "enabled_functions": ["portfolio_optimization"]
}
```
Pass the path via `--config`. Premium enables all functions automatically.

## Where to integrate IBM SDKs
See `ibm_quantum_orchestrator_poc/backends.py` `MockIBMQuantumBackend`. Replace the stubbed section with calls to `qiskit_ibm_runtime` or future Qiskit Functions SDKs. Payloads are already structured for program execution.

## Tests
```bash
python -m pytest ibm_quantum_orchestrator_poc/tests
```
