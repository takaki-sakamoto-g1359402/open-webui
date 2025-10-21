"""Gmail sender stub with dry-run."""
from __future__ import annotations

import os
from typing import Optional

from ..store import record_send
from ..utils import json_log

DRY_RUN = os.getenv("DRY_RUN", "true").lower() != "false"


def send_email(*, thread_id: Optional[str], to: str, subject: str, body: str, message_id: int, draft_id: Optional[int]) -> dict:
    if DRY_RUN:
        json_log(20, "WOULD_SEND Gmail message", to=to, dry_run=True)
        record_send(message_id=message_id, draft_id=draft_id, platform="gmail", status="dry_run", dry_run=True)
        return {"status": "dry_run"}
    # Real implementation would use Gmail API.
    json_log(40, "Gmail send attempted without implementation", to=to)
    record_send(message_id=message_id, draft_id=draft_id, platform="gmail", status="not_implemented", dry_run=False)
    return {"status": "not_implemented"}
