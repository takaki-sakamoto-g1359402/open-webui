from __future__ import annotations

from typing import Any, Dict

from hmos.connectors.base import Connector, ConnectorCapability
from hmos.models import ConnectorResult, RiskLevel


class WebSearchConnector(Connector):
    name = "web_search"
    capabilities = (ConnectorCapability("web_search", RiskLevel.RISK0),)

    def execute(self, payload: Dict[str, Any]) -> ConnectorResult:
        query = payload.get("query", "")
        return ConnectorResult(
            status="ok",
            output={
                "query": query,
                "results": [
                    {"title": "Stub result", "url": "https://example.com", "snippet": "No live browsing."}
                ],
            },
            external_call=False,
        )
