from __future__ import annotations

from typing import List, Tuple

from ..data.models import Mission
from .sim import GridWorld, astar
from .policies import validate_mission


class MissionPlanner:
    def __init__(self, grid: GridWorld):
        self.grid = grid

    def plan(self, user, mission: Mission) -> List[Tuple[int, int]]:
        start = (mission.start_x, mission.start_y)
        goal = (mission.target_x, mission.target_y)
        path = astar(self.grid, start, goal)
        if path is None:
            raise RuntimeError("no-path")
        if not validate_mission(user, mission, path, self.grid):
            raise PermissionError("policy-denied")
        return path
