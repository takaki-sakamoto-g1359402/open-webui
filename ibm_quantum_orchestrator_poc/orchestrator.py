from __future__ import annotations

import logging
import time
from typing import Dict, List

from .backends import QuantumBackend
from .models import BaseStep, HybridJob, QuantumStep, StepResult, StepType

logger = logging.getLogger(__name__)


class HybridOrchestrator:
    """Executes classical and quantum steps using the provided backend."""

    def __init__(self, backend: QuantumBackend, max_quantum_retries: int = 1):
        self.backend = backend
        self.max_quantum_retries = max_quantum_retries

    def run(self, job: HybridJob) -> List[StepResult]:
        job.validate()
        context: Dict[str, any] = {}
        results: List[StepResult] = []
        for step in job:
            logger.info("Starting step '%s' (%s)", step.name, step.step_type.value)
            start = time.time()
            try:
                if step.step_type == StepType.CLASSICAL:
                    result = step.run(context)
                elif step.step_type == StepType.QUANTUM:
                    result = self._run_quantum_step(step, context)
                else:
                    raise ValueError(f"Unsupported step type: {step.step_type}")
                if result.success:
                    context.update(result.output)
            except Exception as exc:  # broad for orchestration boundary
                logger.exception("Step '%s' failed: %s", step.name, exc)
                result = StepResult(step_name=step.name, step_type=step.step_type, output={}, success=False, error=str(exc))
            duration = time.time() - start
            logger.info("Finished step '%s' in %.3fs", step.name, duration)
            results.append(result)
            if not result.success:
                break
        return results

    def _run_quantum_step(self, step: BaseStep, context: Dict[str, any]) -> StepResult:
        assert isinstance(step, QuantumStep)
        payload = step.payload_builder(context)
        attempt = 0
        last_error: str | None = None
        while attempt <= self.max_quantum_retries:
            try:
                output = self.backend.run_quantum_function(step.function_name, payload)
                return StepResult(step_name=step.name, step_type=step.step_type, output=output)
            except Exception as exc:  # broad for retry logic
                logger.warning("Quantum step '%s' failed on attempt %s: %s", step.name, attempt + 1, exc)
                last_error = str(exc)
                attempt += 1
                if attempt > self.max_quantum_retries:
                    break
        return StepResult(step_name=step.name, step_type=step.step_type, output={}, success=False, error=last_error)
