from __future__ import annotations

from typing import Dict, List, Optional

from .models import AiTool, EvaluationResult, Principle, UseCaseProposal


class InMemoryPrincipleRepository:
    def __init__(self, seed: Optional[List[Principle]] = None) -> None:
        self._principles: Dict[str, Principle] = {}
        for p in seed or []:
            self.add(p)

    def add(self, principle: Principle) -> None:
        self._principles[principle.id] = principle

    def list(self) -> List[Principle]:
        return list(self._principles.values())

    def get(self, principle_id: str) -> Optional[Principle]:
        return self._principles.get(principle_id)


class InMemoryToolRepository:
    def __init__(self) -> None:
        self._tools: Dict[str, AiTool] = {}

    def add(self, tool: AiTool) -> None:
        self._tools[tool.id] = tool

    def get(self, tool_id: str) -> Optional[AiTool]:
        return self._tools.get(tool_id)

    def list(self) -> List[AiTool]:
        return list(self._tools.values())


class InMemoryProposalRepository:
    def __init__(self) -> None:
        self._proposals: Dict[str, UseCaseProposal] = {}

    def add(self, proposal: UseCaseProposal) -> None:
        self._proposals[proposal.id] = proposal

    def get(self, proposal_id: str) -> Optional[UseCaseProposal]:
        return self._proposals.get(proposal_id)

    def list(self) -> List[UseCaseProposal]:
        return list(self._proposals.values())


class InMemoryEvaluationRepository:
    def __init__(self) -> None:
        self._evaluations: Dict[str, EvaluationResult] = {}

    def save(self, result: EvaluationResult) -> None:
        self._evaluations[result.proposal_id] = result

    def get_latest_for_proposal(self, proposal_id: str) -> Optional[EvaluationResult]:
        return self._evaluations.get(proposal_id)

