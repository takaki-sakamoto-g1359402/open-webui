from __future__ import annotations

import heapq
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

from ..data.models import GeoFence

Coord = Tuple[int, int]


@dataclass
class GridWorld:
    width: int = 50
    height: int = 50
    obstacles: Set[Coord] = None
    geofences: List[GeoFence] = None

    def __post_init__(self):
        self.obstacles = self.obstacles or set()
        self.geofences = self.geofences or []

    def in_bounds(self, coord: Coord) -> bool:
        x, y = coord
        return 0 <= x < self.width and 0 <= y < self.height

    def passable(self, coord: Coord) -> bool:
        if coord in self.obstacles:
            return False
        for g in self.geofences:
            inside = g.x1 <= coord[0] <= g.x2 and g.y1 <= coord[1] <= g.y2
            if inside and not g.allowed:
                return False
        return True

    def neighbors(self, coord: Coord) -> List[Coord]:
        x, y = coord
        results = [(x+1,y), (x-1,y), (x,y+1), (x,y-1)]
        results = [c for c in results if self.in_bounds(c) and self.passable(c)]
        return results


def heuristic(a: Coord, b: Coord) -> int:
    return abs(a[0]-b[0]) + abs(a[1]-b[1])


def astar(grid: GridWorld, start: Coord, goal: Coord) -> Optional[List[Coord]]:
    frontier: List[Tuple[int, Coord]] = []
    heapq.heappush(frontier, (0, start))
    came_from: Dict[Coord, Optional[Coord]] = {start: None}
    cost: Dict[Coord, int] = {start: 0}

    while frontier:
        _, current = heapq.heappop(frontier)
        if current == goal:
            break
        for next_ in grid.neighbors(current):
            new_cost = cost[current] + 1
            if next_ not in cost or new_cost < cost[next_]:
                cost[next_] = new_cost
                priority = new_cost + heuristic(goal, next_)
                heapq.heappush(frontier, (priority, next_))
                came_from[next_] = current

    if goal not in came_from:
        return None
    path: List[Coord] = []
    current = goal
    while current:
        path.append(current)
        current = came_from[current]
    path.reverse()
    return path
