from __future__ import annotations

from typing import Any, Dict

from ugw.authz.opa import OPAClient, validate_path


def evaluate_policy(input_payload: Dict[str, Any]) -> Dict[str, Any]:
    validate_path(input_payload["request"]["path"])
    client = OPAClient()
    return client.evaluate(input_payload)
