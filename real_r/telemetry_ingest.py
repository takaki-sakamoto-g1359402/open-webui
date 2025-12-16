"""Helpers to apply telemetry to the virtual world."""
from __future__ import annotations

from fleet_core.models import Telemetry, WorldStateV
from sim_v.env import VirtualEnv


def apply_telemetry_to_virtual(env: VirtualEnv, telemetry: Telemetry) -> WorldStateV:
    """Update the digital twin using telemetry reports."""

    env.update_from_telemetry(telemetry.robot_updates)
    return env.get_state()
