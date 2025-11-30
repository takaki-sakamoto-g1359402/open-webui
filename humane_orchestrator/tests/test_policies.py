from humane_orchestrator.app.models import AiTool, Capability, Risk, UseCaseProposal
from humane_orchestrator.app.policies import DEFAULT_PRINCIPLES, evaluate_policy


def test_mass_persuasion_political_campaign_triggers_violation():
    tool = AiTool(
        id="tool-1",
        name="Persuader",
        description="",
        capabilities=[Capability(id="c1", name="Mass Persuasion", description="")],
        risks=[],
    )
    proposal = UseCaseProposal(
        id="prop-1",
        title="Election outreach",
        description="",
        tool_id="tool-1",
        intended_audience="voters",
        context="Political campaign",
    )

    result = evaluate_policy(proposal, tool, DEFAULT_PRINCIPLES)

    assert result.score < 0.8
    assert "collective-deliberation" in result.violated_principles
    assert result.warnings


def test_deepfake_information_use_case_is_penalized():
    tool = AiTool(
        id="tool-2",
        name="Deepfaker",
        description="",
        capabilities=[Capability(id="c2", name="Deepfake Generation", description="")],
        risks=[Risk(id="r1", name="Misinfo", description="", severity="high")],
    )
    proposal = UseCaseProposal(
        id="prop-2",
        title="News video creation",
        description="",
        tool_id="tool-2",
        intended_audience="public",
        context="News information",
    )

    result = evaluate_policy(proposal, tool, DEFAULT_PRINCIPLES)

    assert result.score < 0.7
    assert "no-mass-manipulation" in result.violated_principles
    assert result.warnings


def test_benign_tutor_use_case_scores_high():
    tool = AiTool(
        id="tool-3",
        name="Tutor",
        description="",
        capabilities=[Capability(id="c3", name="Language Tutoring", description="")],
        risks=[],
    )
    proposal = UseCaseProposal(
        id="prop-3",
        title="Language help",
        description="",
        tool_id="tool-3",
        intended_audience="students",
        context="Education",
    )

    result = evaluate_policy(proposal, tool, DEFAULT_PRINCIPLES)

    assert result.score >= 0.9
    assert not result.violated_principles
    assert result.passed

