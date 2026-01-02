from __future__ import annotations

import requests

from ugw.core.config import settings


class OPAClient:
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = base_url or settings.opa_url

    def evaluate(self, input_payload: dict) -> dict:
        url = f"{self.base_url}/v1/data/ugw/authz"
        headers = {"Authorization": f"Bearer {settings.opa_token}"}
        response = requests.post(url, json={"input": input_payload}, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()


def validate_path(path: str) -> None:
    if not any(path.startswith(prefix) for prefix in settings.trusted_path_prefixes):
        raise ValueError("Untrusted path")
