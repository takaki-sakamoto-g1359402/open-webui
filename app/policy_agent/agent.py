from typing import Dict, List, Optional

from .db import Database
from .planner import Planner
from .policy import PolicyEngine
from .tools import Tools


class Agent:
    def __init__(self, db: Database, planner: Planner, policy: PolicyEngine):
        self.db = db
        self.planner = planner
        self.policy = policy
        self.tools = Tools(db, policy)

    def process_event(self, event: Dict, pop_token: Optional[str] = None) -> Dict:
        text = event.get("payload", "")
        plan = self.planner.plan(text)
        decision_id = self.db.add_decision(
            event_id=event["id"],
            plan=plan,
            policy_result="evaluating",
            explanation=plan.get("explanation", ""),
        )
        result_summary: List[str] = []
        findings_cache: Optional[Dict] = None
        for step in plan.get("steps", []):
            tool = step.get("tool")
            tool_input = step.get("input", {})
            if tool == "knowledge.search":
                res = self.tools.knowledge_search(decision_id, tool_input.get("query", text))
                result_summary.append("knowledge.search")
            elif tool == "pqc.scan":
                findings_cache = self.tools.pqc_scan(decision_id, tool_input.get("text", text))
                result_summary.append("pqc.scan")
            elif tool == "pqc.checklist":
                findings_input = findings_cache or tool_input
                res_md = self.tools.pqc_checklist(decision_id, findings_input or {})
                result_summary.append("pqc.checklist")
                findings_cache = {"markdown": res_md, **(findings_cache or {})}
            elif tool == "file.write":
                if findings_cache and "markdown" in findings_cache and not tool_input.get("content"):
                    content = findings_cache.get("markdown", "")
                else:
                    content = tool_input.get("content", text)
                path = tool_input.get("path", "./out/output.txt")
                res = self.tools.file_write(decision_id, path, content, pop_token=pop_token)
                result_summary.append(f"file.write:{res.get('status')}")
            elif tool == "http.get":
                url = tool_input.get("url", "")
                res = self.tools.http_get(decision_id, url, pop_token=pop_token)
                result_summary.append(f"http.get:{res.get('status')}")
            elif tool == "notify.console":
                msg = tool_input.get("message") or f"Handled event {event['id']}"
                self.tools.notify_console(decision_id, msg)
                result_summary.append("notify.console")
        self.db.update_event_status(event["id"], "done")
        policy_result = " -> ".join(result_summary)
        self.db.update_decision(decision_id, policy_result)
        return {"decision_id": decision_id, "summary": policy_result}

    def run_pending(self, pop_token: Optional[str] = None) -> List[Dict]:
        results = []
        for event in self.db.get_pending_events():
            results.append(self.process_event(dict(event), pop_token=pop_token))
        return results

