import json
import os
from pathlib import Path
from typing import Any, Dict

import requests

from .db import Database
from .policy import PolicyEngine
from . import pqc


class Tools:
    def __init__(self, db: Database, policy: PolicyEngine):
        self.db = db
        self.policy = policy

    def _check_policy(self, tool_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        decision = self.policy.check(tool_name, context)
        return decision

    def _record(self, decision_id: int, tool_name: str, tool_input: Dict[str, Any], tool_output: Any, status: str, reason: str) -> None:
        self.db.add_action(decision_id, tool_name, tool_input, tool_output, status=status, reason=reason)

    def knowledge_search(self, decision_id: int, query: str) -> Dict[str, Any]:
        policy = self._check_policy("knowledge.search", {"query": query})
        if not policy.get("allowed"):
            self._record(decision_id, "knowledge.search", {"query": query}, {}, status="denied", reason=policy.get("reason", ""))
            return {"error": policy.get("reason")}
        result = self.db.search_facts(query)
        self._record(decision_id, "knowledge.search", {"query": query}, result, status="ok", reason="")
        return result

    def pqc_scan(self, decision_id: int, text: str) -> Dict[str, Any]:
        policy = self._check_policy("pqc.scan", {})
        if not policy.get("allowed"):
            self._record(decision_id, "pqc.scan", {}, {}, status="denied", reason=policy.get("reason", ""))
            return {"error": policy.get("reason")}
        findings = pqc.scan_text(text)
        self._record(decision_id, "pqc.scan", {"text": text[:1000]}, findings, status="ok", reason="")
        return findings

    def pqc_checklist(self, decision_id: int, findings: Dict[str, Any]) -> str:
        policy = self._check_policy("pqc.checklist", {})
        if not policy.get("allowed"):
            self._record(decision_id, "pqc.checklist", findings, {}, status="denied", reason=policy.get("reason", ""))
            return ""
        md = pqc.checklist(findings.get("findings", []))
        self._record(decision_id, "pqc.checklist", findings, md, status="ok", reason="")
        return md

    def file_write(self, decision_id: int, path: str, content: str, pop_token: str | None = None) -> Dict[str, str]:
        policy = self.policy.check("file.write", {"path": path, "pop_token": pop_token})
        if not policy.get("allowed"):
            self._record(decision_id, "file.write", {"path": path}, {}, status="denied", reason=policy.get("reason", ""))
            return {"status": "denied", "reason": policy.get("reason", "")}
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        self._record(decision_id, "file.write", {"path": path}, {"bytes": len(content)}, status="ok", reason="written")
        return {"status": "ok"}

    def http_get(self, decision_id: int, url: str, pop_token: str | None = None) -> Dict[str, Any]:
        policy = self.policy.check("http.get", {"url": url, "pop_token": pop_token})
        if not policy.get("allowed"):
            self._record(decision_id, "http.get", {"url": url}, {}, status="denied", reason=policy.get("reason", ""))
            return {"status": "denied", "reason": policy.get("reason", "")}
        try:
            resp = requests.get(url, timeout=5)
            data = {"status_code": resp.status_code, "text": resp.text[:200]}
        except Exception as exc:
            data = {"error": str(exc)}
        self._record(decision_id, "http.get", {"url": url}, data, status="ok", reason="fetched")
        return data

    def notify_console(self, decision_id: int, message: str) -> Dict[str, str]:
        policy = self._check_policy("notify.console", {})
        if not policy.get("allowed"):
            self._record(decision_id, "notify.console", {"message": message}, {}, status="denied", reason=policy.get("reason", ""))
            return {"status": "denied", "reason": policy.get("reason", "")}
        print(f"[NOTIFY] {message}")
        self._record(decision_id, "notify.console", {"message": message}, {"status": "printed"}, status="ok", reason="")
        return {"status": "notified"}

