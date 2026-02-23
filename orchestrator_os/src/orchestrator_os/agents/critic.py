from orchestrator_os.core.models import ToolCallResult

CRITIC_PROMPT = "Review results; detect inconsistencies; request safe retries or mitigation."


class CriticAgent:
    def review(self, result: ToolCallResult) -> bool:
        return result.ok
