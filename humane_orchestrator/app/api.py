from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .models import AiToolModel, EvaluationResultModel, PrincipleModel, UseCaseProposalModel
from .policies import DEFAULT_PRINCIPLES, evaluate_policy
from .repositories import (
    InMemoryEvaluationRepository,
    InMemoryPrincipleRepository,
    InMemoryProposalRepository,
    InMemoryToolRepository,
)

router = APIRouter()

principle_repo = InMemoryPrincipleRepository(seed=DEFAULT_PRINCIPLES)
tool_repo = InMemoryToolRepository()
proposal_repo = InMemoryProposalRepository()
evaluation_repo = InMemoryEvaluationRepository()


@router.get("/principles", response_model=list[PrincipleModel])
def list_principles():
    return principle_repo.list()


@router.post("/tools", response_model=AiToolModel)
def register_tool(tool: AiToolModel):
    tool_repo.add(tool)
    return tool


@router.get("/tools", response_model=list[AiToolModel])
def list_tools():
    return tool_repo.list()


@router.post("/proposals", response_model=UseCaseProposalModel)
def register_proposal(proposal: UseCaseProposalModel):
    if not tool_repo.get(proposal.tool_id):
        raise HTTPException(status_code=404, detail="Tool not found")
    proposal_repo.add(proposal)
    return proposal


@router.post("/proposals/{proposal_id}/evaluate", response_model=EvaluationResultModel)
def evaluate_proposal(proposal_id: str):
    proposal = proposal_repo.get(proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    tool = tool_repo.get(proposal.tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found for proposal")

    result = evaluate_policy(proposal, tool, principle_repo.list())
    evaluation_repo.save(result)
    return result


@router.get("/evaluations/{proposal_id}", response_model=EvaluationResultModel)
def get_evaluation(proposal_id: str):
    result = evaluation_repo.get_latest_for_proposal(proposal_id)
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return result

