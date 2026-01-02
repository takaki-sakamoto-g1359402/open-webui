from __future__ import annotations

from datetime import datetime, timedelta, timezone

from ugw.api.main import check_identity
from ugw.db.database import init_db
from ugw.services import identity


def test_pop_and_vc_revocation(temp_settings):
    init_db()
    identity.create_user("user-1", "User", "participant")
    identity.update_pop("user-1", "stub", {"proof": "ok"})
    expired = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    identity.issue_vc("user-1", expired)
    result = check_identity("user-1")
    assert result["valid"] is False
