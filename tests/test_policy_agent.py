import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.policy_agent.db import Database
from app.policy_agent.policy import PolicyEngine
from app.policy_agent.tools import Tools
from app.policy_agent import pqc


def test_policy_default_deny(tmp_path: Path):
    db = Database(tmp_path / "test.db")
    policy_file = tmp_path / "policy.yaml"
    policy_file.write_text(
        "tools:\n  allow: []\n  deny: []\npaths:\n  allow: []\nnetwork:\n  allow_domains: []\nsensitive_tools: []\n",
        encoding="utf-8",
    )
    policy = PolicyEngine(db, policy_path=policy_file)
    decision = policy.check("file.write", {"path": str(tmp_path / "out.txt")})
    assert decision["allowed"] is False


def test_pop_token_required(tmp_path: Path):
    db = Database(tmp_path / "test.db")
    policy_file = tmp_path / "policy.yaml"
    allowed_path = str(tmp_path / "out")
    policy_file.write_text(
        f"""
tools:
  allow:
    - file.write
  deny: []
paths:
  allow:
    - {allowed_path}
network:
  allow_domains: []
sensitive_tools:
  - file.write
        """.strip(),
        encoding="utf-8",
    )
    policy = PolicyEngine(db, policy_path=policy_file)
    tools = Tools(db, policy)
    res = tools.file_write(1, str(tmp_path / "out" / "a.txt"), "hi", pop_token=None)
    assert res["status"] == "denied"


def test_pqc_scan_detects_keywords():
    text = "This config uses RSA and TLS1.2 alongside ECDSA."
    result = pqc.scan_text(text)
    assert "RSA" in result["findings"]
    assert "TLS1.2" in result["findings"]
