from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Dict

from ugw.core.keys import get_oracle_keys, load_private_key, load_public_key
from ugw.db.database import db_session
from ugw.utils.crypto import canonical_json, sha256_digest


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sign_fact(fact: Dict) -> Dict:
    keys = get_oracle_keys().load()
    private_key = load_private_key(keys["private_key"])
    payload = canonical_json(fact)
    signature = private_key.sign(payload)
    return {
        **fact,
        "signature": signature.hex(),
        "digest": sha256_digest(payload),
    }


def verify_fact(fact: Dict) -> bool:
    keys = get_oracle_keys().load()
    public_key = load_public_key(keys["public_key"])
    payload = canonical_json({k: fact[k] for k in fact if k not in {"signature", "digest"}})
    try:
        public_key.verify(bytes.fromhex(fact["signature"]), payload)
        if "digest" in fact:
            return sha256_digest(payload) == fact["digest"]
        return True
    except Exception:  # noqa: BLE001
        return False


def store_fact(subject_id: str, fact_type: str, payload: Dict) -> Dict:
    fact = {
        "subject_id": subject_id,
        "fact_type": fact_type,
        "payload": payload,
        "issued_at": utc_now(),
    }
    signed = sign_fact(fact)
    with db_session() as conn:
        conn.execute(
            "INSERT INTO oracle_facts (id, subject_id, fact_type, payload, signature, issued_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                signed["digest"],
                subject_id,
                fact_type,
                json.dumps(payload),
                signed["signature"],
                signed["issued_at"],
            ),
        )
    return signed


def list_facts(subject_id: str) -> list[dict]:
    with db_session() as conn:
        rows = conn.execute("SELECT * FROM oracle_facts WHERE subject_id = ?", (subject_id,)).fetchall()
    facts = []
    for row in rows:
        facts.append(
            {
                "subject_id": row["subject_id"],
                "fact_type": row["fact_type"],
                "payload": json.loads(row["payload"]),
                "signature": row["signature"],
                "issued_at": row["issued_at"],
            }
        )
    return facts
