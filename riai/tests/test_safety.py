from __future__ import annotations

from pathlib import Path

import pytest

from riai.safety import SafetyGuard, SafetyViolation


@pytest.fixture()
def safety_guard() -> SafetyGuard:
    policy_path = Path(__file__).resolve().parents[1] / "policies" / "safety.yaml"
    return SafetyGuard.from_yaml(policy_path)


def test_denylist_blocks_rm(safety_guard: SafetyGuard) -> None:
    with pytest.raises(SafetyViolation):
        safety_guard.check_shell_command("rm -rf /")


def test_domain_allowlist_blocks_unknown(safety_guard: SafetyGuard) -> None:
    with pytest.raises(SafetyViolation):
        safety_guard.ensure_web_allowed("https://example.com")


def test_allowlist_permits_safe_command(safety_guard: SafetyGuard) -> None:
    safety_guard.check_shell_command("ls")

