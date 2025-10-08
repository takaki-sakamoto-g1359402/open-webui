"""Human-in-the-loop controller."""
from __future__ import annotations

from typing import Tuple

from ..data.models import Mission
from .planner import MissionPlanner


class OperatorController:
    def __init__(self, planner: MissionPlanner):
        self.planner = planner

    def retask(self, user, mission: Mission, new_target: Tuple[int, int]):
        mission.target_x, mission.target_y = new_target
        return self.planner.plan(user, mission)
