import subprocess
import json


def distribute(profits, balances):
    total = sum(balances.values())
    return {addr: profits * bal / total for addr, bal in balances.items()}


def test_distribution():
    profits = 100
    balances = {"alice": 70, "bob": 30}
    result = distribute(profits, balances)
    assert result["alice"] == 70
    assert result["bob"] == 30


def test_cross_language_example():
    """Bonus: ensure Node.js environment accessible from Python tests."""
    out = subprocess.check_output(["node", "-e", "console.log(JSON.stringify({v:1}))"])
    data = json.loads(out)
    assert data["v"] == 1
