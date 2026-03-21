from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from realitybridge_core.domain.enums import BridgeMode


@dataclass(slots=True)
class BridgeExecutionResult:
    accepted: bool
    mode: BridgeMode
    message: str
    payload: dict[str, Any]


class BridgeAdapter(Protocol):
    def execute(self, *, device_id: str, action: str, payload: dict[str, Any]) -> BridgeExecutionResult:
        ...


class SimulationBridgeAdapter:
    def execute(self, *, device_id: str, action: str, payload: dict[str, Any]) -> BridgeExecutionResult:
        return BridgeExecutionResult(
            accepted=True,
            mode=BridgeMode.SIMULATION,
            message="Action simulated only. No real-world actuation performed.",
            payload={"device_id": device_id, "action": action, "requested_payload": payload},
        )
