import json

from orchestrator_os.agents.riai import RIAI_PROMPT
from orchestrator_os.core.llm import LLMClient
from orchestrator_os.core.models import Plan

PLANNER_PROMPT = "Create a stepwise plan with tool candidates and risk hints."


class PlannerAgent:
    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    def make_plan(self, goal: str) -> Plan:
        response = self.llm.chat(
            system_prompt=f"{RIAI_PROMPT}\n{PLANNER_PROMPT}",
            messages=[{"role": "user", "content": goal}],
        )
        payload = json.loads(response)
        return Plan.model_validate({"steps": payload["steps"]})
