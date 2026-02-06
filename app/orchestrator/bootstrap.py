from __future__ import annotations

from dataclasses import dataclass

from app.agents.specialists import build_specialists
from app.orchestrator.engine import OrchestratorDependencies, OrchestratorEngine
from app.policy.engine import PolicyEngine
from app.storage.database import Database
from app.storage.repository import (
    ApprovalRepository,
    AuditRepository,
    EventRepository,
    MemoryRepository,
    PolicyRepository,
    TaskRepository,
)
from app.tools.implementations import ToolState, build_registry
from app.utils.config import AppConfig


@dataclass(slots=True)
class ApplicationContainer:
    config: AppConfig
    db: Database
    tool_state: ToolState
    orchestrator: OrchestratorEngine
    events: EventRepository
    tasks: TaskRepository
    approvals: ApprovalRepository
    audit: AuditRepository
    policies: PolicyRepository
    memories: MemoryRepository



def build_container(config: AppConfig) -> ApplicationContainer:
    db = Database(config.database.path)
    events = EventRepository(db)
    tasks = TaskRepository(db)
    approvals = ApprovalRepository(db)
    audit = AuditRepository(db)
    policies = PolicyRepository(db)
    memories = MemoryRepository(db)

    tool_registry, tool_state = build_registry()
    policy_engine = PolicyEngine(config.governance)
    agents = build_specialists()

    deps = OrchestratorDependencies(
        config=config,
        policy_engine=policy_engine,
        tool_registry=tool_registry,
        agents=agents,
        events=events,
        tasks=tasks,
        approvals=approvals,
        audit=audit,
        policies=policies,
        memories=memories,
    )
    orchestrator = OrchestratorEngine(deps)
    return ApplicationContainer(
        config=config,
        db=db,
        tool_state=tool_state,
        orchestrator=orchestrator,
        events=events,
        tasks=tasks,
        approvals=approvals,
        audit=audit,
        policies=policies,
        memories=memories,
    )
