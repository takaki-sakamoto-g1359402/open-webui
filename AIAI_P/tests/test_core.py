import types
from typing import Any

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from AIAI_P import aiai_p, database

def test_rank_partners(tmp_path: Any, monkeypatch: Any) -> None:
    innovators = [
        {"name": "A", "domain": "health"},
        {"name": "B", "domain": "tech"},
    ]
    monkeypatch.setattr(database, "get_partner_weight", lambda n: 1)
    monkeypatch.setattr(database, "total_history", lambda: 1)
    monkeypatch.setattr(database, "pair_stats", lambda n: (0, 0))
    res = aiai_p.rank_partners("health", innovators)
    assert res[0]["name"] == "A"


def test_translate_query(monkeypatch: Any) -> None:
    class Dummy:
        choices = [types.SimpleNamespace(message=types.SimpleNamespace(content='{"language": "en", "translation": "hi"}'))]
    import openai
    monkeypatch.setattr(openai.ChatCompletion, "create", lambda **k: Dummy())
    text, lang = aiai_p.translate_query("hi")
    assert text == "hi" and lang is None
