from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any, Dict
from urllib.parse import urlparse

import requests

from hmos.connectors.base import Connector, ConnectorCapability
from hmos.models import ConnectorResult, RiskLevel
from hmos.storage import Storage
from hmos.utils.canonical_json import canonical_dumps

logger = logging.getLogger("hmos.http")


class HttpApiConnector(Connector):
    name = "http_api"
    capabilities = (ConnectorCapability("http_call", RiskLevel.RISK2),)

    def __init__(self, storage: Storage, allowlist: tuple[str, ...]) -> None:
        self._storage = storage
        self._allowlist = allowlist

    def execute(self, payload: Dict[str, Any]) -> ConnectorResult:
        url = payload.get("url", "")
        method = payload.get("method", "GET").upper()
        body = payload.get("body")
        idempotency_key = payload.get("idempotency_key")
        if not idempotency_key:
            raise ValueError("idempotency_key is required for external HTTP calls")

        parsed = urlparse(url)
        if parsed.hostname not in self._allowlist:
            raise ValueError(f"Host {parsed.hostname} is not in allowlist")

        cached = self._storage.get_idempotency_result(self.name, idempotency_key)
        if cached:
            return ConnectorResult(status="cached", output=cached, external_call=True, idempotency_key=idempotency_key)

        payload_hash = hashlib.sha256(canonical_dumps(body).encode("utf-8")).hexdigest() if body else ""

        headers = {"Idempotency-Key": idempotency_key}
        start = time.monotonic()
        response = requests.request(method, url, json=body, headers=headers, timeout=10)
        latency_ms = int((time.monotonic() - start) * 1000)

        self._log_safe_request(
            method=method,
            url=url,
            status=response.status_code,
            latency_ms=latency_ms,
            payload_hash=payload_hash,
            idempotency_key=idempotency_key,
        )

        output = {
            "status_code": response.status_code,
            "headers": {"content-type": response.headers.get("content-type", "")},
            "body": response.text[:2000],
        }
        self._storage.store_idempotency_result(self.name, idempotency_key, output)
        return ConnectorResult(status="ok", output=output, external_call=True, idempotency_key=idempotency_key)

    @staticmethod
    def _log_safe_request(
        method: str,
        url: str,
        status: int,
        latency_ms: int,
        payload_hash: str,
        idempotency_key: str,
    ) -> None:
        parsed = urlparse(url)
        record = {
            "method": method,
            "host": parsed.hostname,
            "path": parsed.path,
            "status": status,
            "latency_ms": latency_ms,
            "payload_hash": payload_hash,
            "idempotency_key": idempotency_key,
        }
        logger.info(json.dumps(record, separators=(",", ":"), sort_keys=True))
