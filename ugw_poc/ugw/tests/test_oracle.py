from __future__ import annotations

from ugw.db.database import init_db
from ugw.services.oracle import sign_fact, verify_fact, store_fact


def test_oracle_fact_verification(temp_settings):
    init_db()
    fact = {"subject_id": "user-1", "fact_type": "sanctioned", "payload": {"flag": True}, "issued_at": "now"}
    signed = sign_fact(fact)
    assert verify_fact(signed) is True
    stored = store_fact("user-1", "sanctioned", {"flag": True})
    assert stored["subject_id"] == "user-1"
