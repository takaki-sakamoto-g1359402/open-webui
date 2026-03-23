import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "apps" / "api"))

from app.main import compute_score, load_seed


def test_score_is_deterministic():
    data = load_seed()["observations"]
    kenya = [o for o in data if o["iso3"] == "KEN"]
    first = compute_score(kenya)
    second = compute_score(kenya)
    assert first["score"] == second["score"]
    assert first["confidence"] == second["confidence"]


def test_citations_are_present_in_seed_observations():
    data = load_seed()["observations"]
    for row in data:
        assert row["sourceUrl"].startswith("https://")
        assert row["sourceOrganization"]
        assert row["sourceDocumentTitle"]


def test_no_fabricated_when_no_evidence():
    result = compute_score([])
    assert result["score"] == 0
    assert result["confidence"] == 0
