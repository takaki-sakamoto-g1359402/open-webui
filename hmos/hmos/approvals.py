from __future__ import annotations

import uuid
from dataclasses import dataclass

from hmos.storage import Storage


@dataclass(frozen=True)
class ApprovalRequest:
    run_id: str
    step_id: str
    summary: str
    destination: str
    payload_hash: str


def create_approval(storage: Storage, request: ApprovalRequest) -> str:
    approval_id = str(uuid.uuid4())
    storage.add_approval(
        approval_id,
        request.run_id,
        request.step_id,
        request.summary,
        request.destination,
        request.payload_hash,
    )
    return approval_id


def has_approval(storage: Storage, step_id: str) -> bool:
    return storage.has_approval(step_id)
