from orchestrator_os.core.models import PlanStep

TOOL_ROUTER_PROMPT = "Select the best tool based on registry + constraints; do not invent tools."


class ToolRouterAgent:
    def choose_tool(self, step: PlanStep) -> str:
        return step.suggested_tools[0]
