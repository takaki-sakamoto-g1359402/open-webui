from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def test_import_agent() -> None:
    import riai

    assert hasattr(riai, "Agent")


def test_cli_help() -> None:
    env = os.environ.copy()
    src_path = Path(__file__).resolve().parents[1] / "src"
    env["PYTHONPATH"] = str(src_path) + os.pathsep + env.get("PYTHONPATH", "")
    result = subprocess.run(
        [sys.executable, "-m", "riai.cli", "--help"],
        check=False,
        capture_output=True,
        text=True,
        env=env,
    )
    assert result.returncode == 0
    assert "Usage" in result.stdout or "Usage" in result.stderr

