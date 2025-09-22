"""Attribute-based access control policy evaluation."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class Decision:
    effect: str
    rule_id: Optional[str]
    obligations: List[str]


class PolicyDecisionPoint:
    def __init__(self, policy_path: Path) -> None:
        self.policy_path = policy_path
        self._policy = json.loads(policy_path.read_text())
        self._hierarchy = self._policy.get("hierarchy", {})

    def _index(self, hierarchy: str, value: str) -> int:
        order = self._hierarchy.get(hierarchy, [])
        if value not in order:
            raise ValueError(f"value {value} not in hierarchy {hierarchy}")
        return order.index(value)

    def _compare_min(self, hierarchy: str, provided: str, minimum: str) -> bool:
        return self._index(hierarchy, provided) >= self._index(hierarchy, minimum)

    def _compare_max(self, hierarchy: str, provided: str, maximum: str) -> bool:
        return self._index(hierarchy, provided) <= self._index(hierarchy, maximum)

    def _match_subject(self, rule: Dict[str, object], subject: Dict[str, object]) -> bool:
        if not rule:
            return True
        roles_any = rule.get("roles_any")
        if roles_any:
            subject_roles = subject.get("roles", [])
            if not any(role in subject_roles for role in roles_any):
                return False
        attrs = rule.get("attributes", {})
        if "clearance_min" in attrs:
            subject_clearance = subject.get("attributes", {}).get("clearance")
            if subject_clearance is None:
                return False
            if not self._compare_min("clearance", subject_clearance, attrs["clearance_min"]):
                return False
        for key, value in attrs.items():
            if key == "clearance_min":
                continue
            if subject.get("attributes", {}).get(key) != value:
                return False
        return True

    def _match_resource(self, rule: Dict[str, object], resource: Dict[str, object]) -> bool:
        if not rule:
            return True
        classification_max = rule.get("classification_max")
        if classification_max:
            resource_classification = resource.get("classification")
            if resource_classification is None:
                return False
            if not self._compare_max(
                "classification", resource_classification, classification_max
            ):
                return False
        return True

    def _match_context(
        self, rule: Dict[str, object], context: Dict[str, object], effect: str
    ) -> bool:
        if not rule:
            return True
        if "need_to_know" in rule and context.get("need_to_know") != rule["need_to_know"]:
            return False
        if "incident_severity_min" in rule:
            severity = context.get("incident_severity")
            if severity is None:
                return False
            if not self._compare_min(
                "incident_severity", severity, rule["incident_severity_min"]
            ):
                return False
        if "location_whitelist" in rule:
            whitelist = set(rule["location_whitelist"])
            location = context.get("location")
            if effect == "deny":
                return location not in whitelist
            return location in whitelist
        return True

    def evaluate(
        self,
        *,
        subject: Dict[str, object],
        resource: Dict[str, object],
        action: str,
        context: Dict[str, object],
    ) -> Decision:
        obligations: List[str] = []
        decision = Decision(effect="deny", rule_id=None, obligations=obligations)
        for rule in self._policy.get("rules", []):
            actions = rule.get("actions", [])
            if actions and action not in actions:
                continue
            if not self._match_subject(rule.get("subject", {}), subject):
                continue
            if not self._match_resource(rule.get("resource", {}), resource):
                continue
            if not self._match_context(rule.get("context", {}), context, rule.get("effect", "allow")):
                continue
            effect = rule.get("effect", "deny")
            if effect == "deny":
                return Decision(effect="deny", rule_id=rule.get("id"), obligations=[])
            obligations.append(rule.get("id", ""))
            decision = Decision(effect="allow", rule_id=rule.get("id"), obligations=obligations.copy())
        return decision


__all__ = ["Decision", "PolicyDecisionPoint"]
