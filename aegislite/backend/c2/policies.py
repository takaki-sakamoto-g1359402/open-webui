"""Mission rule helpers."""
from __future__ import annotations
from typing import Iterable

from ..auth.rbac import check_access
from ..data.models import Mission
from .sim import GridWorld


def validate_mission(user, mission: Mission, path: Iterable[tuple], grid: GridWorld) -> bool:
    """Return True if mission is allowed for the user and path respects geofences."""
    if not check_access(user, "plan", mission.sensitivity):
        return False
    for coord in path:
        if not grid.passable(coord):
            return False
    return True
