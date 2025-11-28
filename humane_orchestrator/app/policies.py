from __future__ import annotations

from typing import Iterable, List, Tuple

from .models import AiTool, EvaluationResult, Principle, UseCaseProposal

DEFAULT_PRINCIPLES: List[Principle] = [
    Principle(id="safety", name="Human Safety First", description="Avoid physical, psychological, and societal harm."),
    Principle(id="autonomy", name="Respect for Human Autonomy", description="No coercion or hidden manipulation."),
    Principle(id="no-mass-manipulation", name="No Hidden Mass Manipulation", description="Discourage opaque influence at scale."),
    Principle(
        id="collective-deliberation",
        name="Support Collective Understanding & Democratic Deliberation",
        description="Protect open, pluralistic decision-making.",
    ),
]


def _flatten_capability_text(tool: AiTool) -> Iterable[str]:
    for cap in tool.capabilities:
        yield cap.name.lower()
        yield cap.description.lower()


def _detect_capability(tool: AiTool, keywords: Tuple[str, ...]) -> bool:
    cap_text = list(_flatten_capability_text(tool))
    for keyword in keywords:
        lowered = keyword.lower()
        if any(lowered in text for text in cap_text):
            return True
    return False


def evaluate_policy(proposal: UseCaseProposal, tool: AiTool, principles: List[Principle]) -> EvaluationResult:
    warnings: List[str] = []
    violated: List[str] = []
    score = 1.0

    context = proposal.context.lower()

    if _detect_capability(tool, ("mass persuasion", "micro-targeting")) and "political" in context:
        warnings.append("Democratic risk: persuasion tooling in political context")
        violated.extend([p.id for p in principles if p.id in {"autonomy", "collective-deliberation"}])
        score -= 0.35

    if _detect_capability(tool, ("deepfake", "synthetic media")) and ("news" in context or "information" in context):
        warnings.append("High risk of misinformation via synthetic media")
        violated.extend([p.id for p in principles if p.id in {"safety", "no-mass-manipulation"}])
        score -= 0.35

    if tool.risks:
        score -= 0.05 * len(tool.risks)

    score = max(0.0, min(1.0, score))
    passed = score >= 0.6 and not violated

    rationale_parts = []
    if violated:
        rationale_parts.append(f"Violated: {', '.join(sorted(set(violated)))}")
    if warnings:
        rationale_parts.append(f"Warnings: {', '.join(warnings)}")
    if not rationale_parts:
        rationale_parts.append("No major concerns detected")

    rationale = " | ".join(rationale_parts)

    return EvaluationResult(
        proposal_id=proposal.id,
        score=score,
        passed=passed,
        violated_principles=sorted(set(violated)),
        warnings=warnings,
        rationale=rationale,
    )

