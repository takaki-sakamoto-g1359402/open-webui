from pydantic import BaseModel

from orchestrator_os.config import get_settings
from orchestrator_os.core.models import RiskTier, ToolCallResult
from orchestrator_os.tools.base import Tool


class WebFetchInput(BaseModel):
    url: str


class WebFetchOutput(BaseModel):
    url: str
    content: str
    mocked: bool


class WebFetchTool(Tool):
    name = "web_fetch"
    description = "Mock web fetch (off by default)"
    risk_tier = RiskTier.R2
    required_scopes = ["net:fetch"]
    input_model = WebFetchInput
    output_model = WebFetchOutput

    def run(self, data: WebFetchInput) -> ToolCallResult:
        settings = get_settings()
        if not settings.enable_web_fetch:
            return ToolCallResult(
                ok=True,
                output=WebFetchOutput(url=data.url, content="mocked content", mocked=True).model_dump(),
            )
        return ToolCallResult(ok=False, error="Real network fetch is disabled in scaffold")
