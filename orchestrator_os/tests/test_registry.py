import pytest

from orchestrator_os.core.models import RiskTier
from orchestrator_os.core.registry import ToolRegistry, ToolSpec
from orchestrator_os.tools.echo import EchoOutput, EchoTool


def test_registry_schema_validation():
    registry = ToolRegistry()
    tool = EchoTool()
    registry.register(
        ToolSpec(
            name=tool.name,
            description=tool.description,
            input_model=tool.input_model,
            output_model=EchoOutput,
            risk_tier=RiskTier.R0,
            required_scopes=tool.required_scopes,
            impl=tool,
        )
    )
    validated = registry.validate_input("echo", {"message": "hello"})
    assert validated.message == "hello"
    with pytest.raises(ValueError):
        registry.validate_input("echo", {"wrong": "field"})
