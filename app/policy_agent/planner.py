from typing import Dict


class Planner:
    def __init__(self, engine: str = "rules"):
        self.engine = engine

    def plan(self, text: str) -> Dict:
        lower = text.lower()
        if "pqc" in lower or "post-quantum" in lower:
            return {
                "goal": "PQC readiness advisory",
                "steps": [
                    {"tool": "knowledge.search", "input": {"query": "pqc"}},
                    {"tool": "pqc.scan", "input": {"text": text}},
                    {"tool": "pqc.checklist", "input": {}},
                    {"tool": "file.write", "input": {"path": "./out/report.md"}},
                    {"tool": "notify.console", "input": {"message": "PQC checklist generated"}},
                ],
                "explanation": "Rules-based PQC helper",
            }
        if "summary" in lower:
            return {
                "goal": "Summarize knowledge snippets",
                "steps": [
                    {"tool": "knowledge.search", "input": {"query": text}},
                    {"tool": "notify.console", "input": {"message": "Summary ready"}},
                ],
                "explanation": "Keyword summary",
            }
        if "task:" in lower:
            return {
                "goal": "Task extraction",
                "steps": [
                    {"tool": "notify.console", "input": {"message": text}},
                    {"tool": "file.write", "input": {"path": "./out/tasks.md"}},
                ],
                "explanation": "Create tasks list",
            }
        return {
            "goal": "Echo",
            "steps": [
                {"tool": "notify.console", "input": {"message": text}},
            ],
            "explanation": "Fallback",
        }

