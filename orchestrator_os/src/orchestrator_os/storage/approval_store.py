from __future__ import annotations

import json
from uuid import uuid4

from orchestrator_os.core.audit import utc_now
from orchestrator_os.core.models import ApprovalRecord, ApprovalStatus, RiskTier
from orchestrator_os.storage.db import get_connection


class ApprovalStore:
    def create(
        self,
        task_id: str,
        actor: str,
        tool_name: str,
        risk_tier: RiskTier,
        scopes: list[str],
        request_payload: dict,
    ) -> ApprovalRecord:
        rec = ApprovalRecord(
            approval_id=str(uuid4()),
            created_at=utc_now(),
            task_id=task_id,
            actor=actor,
            tool_name=tool_name,
            risk_tier=risk_tier,
            scopes=scopes,
            request_payload=request_payload,
            status=ApprovalStatus.PENDING,
        )
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO approvals (approval_id, created_at, task_id, actor, tool_name, risk_tier, scopes_json,
                request_payload_json, status, decision_at, decision_by, decision_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    rec.approval_id,
                    rec.created_at,
                    rec.task_id,
                    rec.actor,
                    rec.tool_name,
                    rec.risk_tier,
                    json.dumps(rec.scopes),
                    json.dumps(rec.request_payload, sort_keys=True, separators=(",", ":"), allow_nan=False),
                    rec.status,
                    None,
                    None,
                    None,
                ),
            )
            conn.commit()
        return rec

    def pending(self) -> list[ApprovalRecord]:
        with get_connection() as conn:
            rows = conn.execute("SELECT * FROM approvals WHERE status='PENDING' ORDER BY created_at ASC").fetchall()
        return [self._row_to_model(r) for r in rows]

    def decide(self, approval_id: str, approve: bool, reason: str, decided_by: str) -> ApprovalRecord:
        status = ApprovalStatus.APPROVED if approve else ApprovalStatus.DENIED
        decision_at = utc_now()
        with get_connection() as conn:
            conn.execute(
                """
                UPDATE approvals
                SET status=?, decision_at=?, decision_by=?, decision_reason=?
                WHERE approval_id=?
                """,
                (status, decision_at, decided_by, reason, approval_id),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM approvals WHERE approval_id=?", (approval_id,)).fetchone()
        if row is None:
            raise KeyError("Approval not found")
        return self._row_to_model(row)

    def for_task(self, task_id: str) -> list[ApprovalRecord]:
        with get_connection() as conn:
            rows = conn.execute("SELECT * FROM approvals WHERE task_id=?", (task_id,)).fetchall()
        return [self._row_to_model(r) for r in rows]

    @staticmethod
    def _row_to_model(row) -> ApprovalRecord:
        return ApprovalRecord(
            approval_id=row["approval_id"],
            created_at=row["created_at"],
            task_id=row["task_id"],
            actor=row["actor"],
            tool_name=row["tool_name"],
            risk_tier=row["risk_tier"],
            scopes=json.loads(row["scopes_json"]),
            request_payload=json.loads(row["request_payload_json"]),
            status=row["status"],
            decision_at=row["decision_at"],
            decision_by=row["decision_by"],
            decision_reason=row["decision_reason"],
        )
