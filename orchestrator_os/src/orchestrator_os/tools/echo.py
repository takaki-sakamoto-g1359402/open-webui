from pydantic import BaseModel, Field

from orchestrator_os.core.models import RiskTier, ToolCallResult
from orchestrator_os.tools.base import Tool


class EchoInput(BaseModel):
    message: str = Field(max_length=4000)


class EchoOutput(BaseModel):
    echoed: str


class EchoTool(Tool):
    name = "echo"
    description = "Return sanitized echo of input"
    risk_tier = RiskTier.R0
    required_scopes = ["internal:echo"]
    input_model = EchoInput
    output_model = EchoOutput

    def run(self, data: EchoInput) -> ToolCallResult:
        clean = data.message.replace("\n", " ").strip()
        return ToolCallResult(ok=True, output=EchoOutput(echoed=clean).model_dump())
