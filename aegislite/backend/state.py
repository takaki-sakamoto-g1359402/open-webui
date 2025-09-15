"""Shared simulation state for the API."""
from .c2.sim import GridWorld
from .c2.planner import MissionPlanner
from .c2.controller import OperatorController


grid = GridWorld()
planner = MissionPlanner(grid)
controller = OperatorController(planner)
