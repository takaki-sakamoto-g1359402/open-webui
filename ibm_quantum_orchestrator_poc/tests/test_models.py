import pytest

from ibm_quantum_orchestrator_poc.models import ClassicalStep, HybridJob, QuantumStep, StepType


def test_hybrid_job_requires_quantum_step():
    job = HybridJob(name="invalid")
    job.add_step(ClassicalStep("c1", lambda ctx: {"a": 1}))
    with pytest.raises(ValueError):
        job.validate()


def test_quantum_step_is_identified():
    job = HybridJob(name="valid")
    job.add_step(ClassicalStep("c1", lambda ctx: {"a": 1}))
    job.add_step(QuantumStep("q1", "fn", lambda ctx: ctx))
    job.validate()
    assert any(step.step_type == StepType.QUANTUM for step in job)
