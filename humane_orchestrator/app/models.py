from __future__ import annotations

from dataclasses import dataclass
from typing import List

from pydantic import BaseModel, Field


@dataclass
class Principle:
    id: str
    name: str
    description: str


@dataclass
class Risk:
    id: str
    name: str
    description: str
    severity: str


@dataclass
class Capability:
    id: str
    name: str
    description: str


@dataclass
class AiTool:
    id: str
    name: str
    description: str
    capabilities: List[Capability]
    risks: List[Risk]


@dataclass
class UseCaseProposal:
    id: str
    title: str
    description: str
    tool_id: str
    intended_audience: str
    context: str


@dataclass
class EvaluationResult:
    proposal_id: str
    score: float
    passed: bool
    violated_principles: List[str]
    warnings: List[str]
    rationale: str


class CapabilityModel(BaseModel):
    id: str
    name: str
    description: str


class RiskModel(BaseModel):
    id: str
    name: str
    description: str
    severity: str = Field(pattern="^(low|medium|high)$")


class AiToolModel(BaseModel):
    id: str
    name: str
    description: str
    capabilities: List[CapabilityModel] = Field(default_factory=list)
    risks: List[RiskModel] = Field(default_factory=list)


class UseCaseProposalModel(BaseModel):
    id: str
    title: str
    description: str
    tool_id: str
    intended_audience: str
    context: str


class EvaluationResultModel(BaseModel):
    proposal_id: str
    score: float
    passed: bool
    violated_principles: List[str]
    warnings: List[str]
    rationale: str


class PrincipleModel(BaseModel):
    id: str
    name: str
    description: str

