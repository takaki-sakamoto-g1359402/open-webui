from __future__ import annotations

from typing import Any, Dict

from hmos.connectors.base import Connector, ConnectorCapability
from hmos.models import ConnectorResult, RiskLevel


class HumanoidConnector(Connector):
    name = "humanoid"
    capabilities = (ConnectorCapability("robot_command", RiskLevel.RISK1),)

    def execute(self, payload: Dict[str, Any]) -> ConnectorResult:
        command = payload.get("command", "idle")
        return ConnectorResult(
            status="ok",
            output={
                "ack": command,
                "sensors": {"battery": 98, "temp_c": 36.6},
            },
            external_call=False,
        )
