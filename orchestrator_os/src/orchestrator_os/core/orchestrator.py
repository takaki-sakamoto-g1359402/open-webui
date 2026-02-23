"""High-level orchestrator wiring."""

from orchestrator_os.agents.critic import CriticAgent
from orchestrator_os.agents.planner import PlannerAgent
from orchestrator_os.agents.tool_router import ToolRouterAgent
from orchestrator_os.config import get_settings
from orchestrator_os.core.llm import MockLLM, OpenAIAdapter
from orchestrator_os.core.policy import PolicyEngine
from orchestrator_os.core.registry import ToolRegistry, ToolSpec
from orchestrator_os.core.runtime import Runtime
from orchestrator_os.storage.db import init_db
from orchestrator_os.tools.echo import EchoTool
from orchestrator_os.tools.filesystem import FilesystemTool
from orchestrator_os.tools.web_fetch import WebFetchTool


def build_runtime() -> Runtime:
    init_db()
    settings = get_settings()
    llm = OpenAIAdapter(settings.openai_api_key) if settings.openai_api_key else MockLLM()

    registry = ToolRegistry()
    for tool in [EchoTool(), FilesystemTool(), WebFetchTool()]:
        registry.register(
            ToolSpec(
                name=tool.name,
                description=tool.description,
                input_model=tool.input_model,
                output_model=tool.output_model,
                risk_tier=tool.risk_tier,
                required_scopes=tool.required_scopes,
                impl=tool,
            )
        )

    return Runtime(
        planner=PlannerAgent(llm),
        router=ToolRouterAgent(),
        critic=CriticAgent(),
        registry=registry,
        policy=PolicyEngine(),
    )
