from aegislite.backend.c2.sim import GridWorld
from aegislite.backend.c2.planner import MissionPlanner
from aegislite.backend.data.models import Mission, GeoFence
from aegislite.backend.auth.models import User


def test_planner_avoids_geofence_and_replans():
    grid = GridWorld(width=10, height=10, geofences=[GeoFence(name="no", allowed=False, x1=3, y1=0, x2=3, y2=9)])
    planner = MissionPlanner(grid)
    user = User(username="op", role="operator", org="ops")
    mission = Mission(name="m", sensitivity=1, start_x=0, start_y=0, target_x=5, target_y=0)
    path = planner.plan(user, mission)
    assert all(x != 3 for x, y in path)
    grid.obstacles.add((1, 0))
    new_path = planner.plan(user, mission)
    assert path != new_path
