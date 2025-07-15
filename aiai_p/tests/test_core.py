import sys
from pathlib import Path
import types
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from aiai_p.domain import bandit, causal
from aiai_p.services import db, openai_adapter, rag


def test_rank_partners(monkeypatch: Any) -> None:
    innovators = [
        {"name": "A", "domain": "health"},
        {"name": "B", "domain": "tech"},
    ]
    monkeypatch.setattr(db, "get_partner_weight", lambda n: 1)
    monkeypatch.setattr(db, "total_history", lambda: 1)
    monkeypatch.setattr(db, "pair_stats", lambda n: (0, 0))
    res = bandit.rank_partners("health", innovators)
    assert res[0]["name"] == "A"


def test_translate_query(monkeypatch: Any) -> None:
    class Dummy:
        msg = types.SimpleNamespace(content='{"language": "en", "translation": "hi"}')
        choices = [types.SimpleNamespace(message=msg)]
    import openai
    monkeypatch.setattr(openai.ChatCompletion, "create", lambda **k: Dummy())
    text, lang = openai_adapter.translate_query("hi")
    assert text == "hi" and lang is None


def test_causal_estimate() -> None:
    a = {"name": "A", "synergy": ["B"], "domain": "x"}
    b = {"name": "B", "domain": "y"}
    assert causal.estimate_impact(a, b) > 0


def test_rag_embed(monkeypatch: Any) -> None:
    called: list[str] = []

    def fake_embed(texts: list[str]) -> list[list[float]]:
        called.extend(texts)
        return [[0.0] * 1536 for _ in texts]

    monkeypatch.setattr(rag, "_embed", fake_embed)
    db = rag.VectorDB()
    db.add_texts(["hello"])
    assert called == ["hello"]


def test_log_history_edge(monkeypatch: Any, tmp_path: Any) -> None:
    temp = tmp_path / "hist.db"
    monkeypatch.setattr(db, "DB_PATH", temp)
    db.init_db()
    db.log_history("A", "B", "success")
    assert db.get_stats() == (1, 0)


