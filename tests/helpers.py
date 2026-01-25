from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from app.agents.builtin import build_agents
from app.orchestrator.engine import OrchestratorContext, OrchestratorEngine
from app.policy.engine import PolicyConfig, PolicyEngine
from app.security.approvals import ApprovalService
from app.security.pqc import PQCSigner
from app.storage.sqlite import SQLiteStorage
from app.tools.builtin import register_builtin_tools
from app.tools.registry import ToolRegistry


def build_test_system(tmp_path: Path) -> dict[str, Any]:
    db_path = tmp_path / "orchestrator.db"
    os.environ["AIOS_DB_PATH"] = str(db_path)
    os.environ["AIOS_WEBAUTHN_HMAC_KEY"] = "test-webauthn-key"
    os.environ["AIOS_OTP_SECRET"] = "JBSWY3DPEHPK3PXP"
    os.environ["AIOS_PQC_PRIVATE_KEY"] = "test-pqc-private"
    os.environ["AIOS_PQC_PUBLIC_KEY"] = "test-pqc-public"

    storage = SQLiteStorage(str(db_path))
    policy_engine = PolicyEngine(PolicyConfig(action_rate_limit_per_hour=50, external_rate_limit_per_hour=50))
    tool_registry = ToolRegistry()
    register_builtin_tools(tool_registry)
    agents = build_agents()
    approval_service = ApprovalService(
        storage=storage,
        pqc_signer=PQCSigner(private_key=os.environ["AIOS_PQC_PRIVATE_KEY"], public_key=os.environ["AIOS_PQC_PUBLIC_KEY"]),
        otp_secret=os.environ["AIOS_OTP_SECRET"],
        webauthn_key=os.environ["AIOS_WEBAUTHN_HMAC_KEY"],
        ttl_seconds=300,
    )
    orchestrator = OrchestratorEngine(
        OrchestratorContext(storage=storage, policy_engine=policy_engine, tool_registry=tool_registry, agents=agents)
    )
    return {
        "storage": storage,
        "policy": policy_engine,
        "tools": tool_registry,
        "agents": agents,
        "approval_service": approval_service,
        "orchestrator": orchestrator,
    }
