from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict

from hmos.models import ConnectorResult, RiskLevel


@dataclass(frozen=True)
class ConnectorCapability:
    name: str
    default_risk: RiskLevel


class Connector(ABC):
    name: str
    capabilities: tuple[ConnectorCapability, ...]

    @abstractmethod
    def execute(self, payload: Dict[str, Any]) -> ConnectorResult:
        raise NotImplementedError
