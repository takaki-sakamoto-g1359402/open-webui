from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from app.schemas.common import AuditRecord, ActorType, PermissionLevel
from app.utils.redaction import hash_payload

ToolCallable = Callable[[dict[str, Any]], dict[str, Any]]
RollbackCallable = Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]
PostCheckCallable = Callable[[dict[str, Any], dict[str, Any]], tuple[bool, str | None]]


@dataclass
class ToolSpec:
    name: str
    permission_level: PermissionLevel
    external_impact: bool
    handler: ToolCallable
    rollback: RollbackCallable | None = None
    post_check: PostCheckCallable | None = None
    description: str = ""
    tags: set[str] = field(default_factory=set)


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec) -> None:
        self._tools[spec.name] = spec

    def get(self, name: str) -> ToolSpec:
        if name not in self._tools:
            raise KeyError(f"Tool not registered: {name}")
        return self._tools[name]

    def list_tools(self) -> list[ToolSpec]:
        return list(self._tools.values())

    def execute(
        self,
        name: str,
        payload: dict[str, Any],
        trace_id: str,
        actor_id: str,
        policy_decision: Any,
        audit_callback: Callable[[AuditRecord], None],
    ) -> dict[str, Any]:
        spec = self.get(name)
        audit_callback(
            AuditRecord(
                trace_id=trace_id,
                actor_id=actor_id,
                actor_type=ActorType.AGENT,
                permission_level=spec.permission_level,
                action=f"tool:{name}",
                status="started",
                inputs=payload,
                outputs={},
                policy_decision=policy_decision,
            )
        )
        result = spec.handler(payload)

        post_check_failed_reason: str | None = None
        if spec.post_check:
            passed, reason = spec.post_check(payload, result)
            if not passed:
                post_check_failed_reason = reason or "post_check_failed"
                if spec.rollback:
                    rollback_result = spec.rollback(payload, result)
                    result["rollback"] = rollback_result
                result["post_check_failed"] = post_check_failed_reason

        result.setdefault("content_hash", hash_payload(result))
        audit_status = "completed" if post_check_failed_reason is None else "failed"
        audit_callback(
            AuditRecord(
                trace_id=trace_id,
                actor_id=actor_id,
                actor_type=ActorType.AGENT,
                permission_level=spec.permission_level,
                action=f"tool:{name}",
                status=audit_status,
                inputs=payload,
                outputs=result,
                policy_decision=policy_decision,
            )
        )
        return result
