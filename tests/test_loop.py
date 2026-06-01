import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lambda_founder.workflow import BusinessLoop


def test_business_loop_runs():
    loop = BusinessLoop()
    results = loop.run(1)
    assert results
