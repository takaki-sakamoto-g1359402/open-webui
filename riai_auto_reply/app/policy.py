"""Policy evaluation utilities."""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Dict, List, Optional

import yaml

from .schemas import ClassificationResult, InboundMessage


class PolicyConfig:
    def __init__(self, raw: Dict):
        self.raw = raw
        self.forbidden_keywords: List[str] = [kw.lower() for kw in raw.get("forbidden_keywords", [])]
        self.auto_topics: List[str] = raw.get("auto_topics", [])
        thresholds = raw.get("risk_thresholds", {})
        self.auto_send_max_risk: int = int(thresholds.get("auto_send_max_risk", 39))
        self.manual_review_risk: int = int(thresholds.get("manual_review_risk", 40))
        self.templates = raw.get("templates", {})
        self.known_contacts = {entry["id"]: entry.get("name") for entry in raw.get("known_contacts", [])}

    def is_known_sender(self, sender_id: str) -> bool:
        return sender_id in self.known_contacts

    def contains_forbidden(self, text: str) -> bool:
        lowered = text.lower()
        return any(token in lowered for token in self.forbidden_keywords)


@lru_cache(maxsize=1)
def load_policy(path: Optional[str] = None) -> PolicyConfig:
    policy_path = path or os.getenv("POLICY_FILE", "config/policy.yaml")
    with open(policy_path, "r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return PolicyConfig(data)


def should_auto_send(
    *,
    message: InboundMessage,
    classification: ClassificationResult,
    draft_text: str,
) -> bool:
    policy = load_policy()

    if classification.risk is not None and classification.risk >= policy.manual_review_risk:
        return False
    if classification.intent not in policy.auto_topics:
        return False
    if message.attachments:
        return False
    if not message.sender.is_contact:
        if not policy.is_known_sender(message.sender.id):
            return False
    if policy.contains_forbidden(message.body_text) or policy.contains_forbidden(draft_text):
        return False
    if len(draft_text) > 220:
        return False
    return True


def get_template_path(language: str) -> str:
    policy = load_policy()
    lang_key = language.lower() if language else "en"
    if lang_key.startswith("ja") and policy.templates.get("ja"):
        return policy.templates["ja"]
    return policy.templates.get("en", "templates/reply_en.txt")
