from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional


class PlanTier(str, Enum):
    STANDARD = "standard"
    PREMIUM = "premium"


class StepType(str, Enum):
    CLASSICAL = "classical"
    QUANTUM = "quantum"


@dataclass
class StepResult:
    step_name: str
    step_type: StepType
    output: Dict[str, Any]
    success: bool = True
    error: Optional[str] = None


@dataclass
class BaseStep:
    name: str
    step_type: StepType

    def run(self, context: Dict[str, Any]) -> StepResult:  # pragma: no cover - interface
        raise NotImplementedError


@dataclass
class ClassicalStep(BaseStep):
    action: Callable[[Dict[str, Any]], Dict[str, Any]]

    def __init__(self, name: str, action: Callable[[Dict[str, Any]], Dict[str, Any]]):
        super().__init__(name=name, step_type=StepType.CLASSICAL)
        self.action = action

    def run(self, context: Dict[str, Any]) -> StepResult:
        output = self.action(context)
        return StepResult(step_name=self.name, step_type=self.step_type, output=output)


@dataclass
class QuantumStep(BaseStep):
    function_name: str
    payload_builder: Callable[[Dict[str, Any]], Dict[str, Any]]

    def __init__(self, name: str, function_name: str, payload_builder: Callable[[Dict[str, Any]], Dict[str, Any]]):
        super().__init__(name=name, step_type=StepType.QUANTUM)
        self.function_name = function_name
        self.payload_builder = payload_builder

    def run(self, context: Dict[str, Any]) -> StepResult:
        # The quantum execution is handled by the orchestrator via the backend, so this
        # method should not be invoked directly.
        raise RuntimeError("QuantumStep should be executed via a QuantumBackend")


@dataclass
class HybridJob:
    name: str
    steps: List[BaseStep] = field(default_factory=list)

    def validate(self) -> None:
        if not self.steps:
            raise ValueError("HybridJob must include at least one step")
        quantum_steps = [s for s in self.steps if s.step_type == StepType.QUANTUM]
        if not quantum_steps:
            raise ValueError("HybridJob must include at least one quantum step")

    def add_step(self, step: BaseStep) -> None:
        self.steps.append(step)

    def __iter__(self):
        return iter(self.steps)
