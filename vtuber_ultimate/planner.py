## Overview
# Schedule planner optimizing viewer stats

import json
from pathlib import Path

from dataclasses import dataclass
from typing import Dict, Any, List
import numpy as np


@dataclass
class StreamStats:
    date: str
    watch_time: float
    revenue: float
    subs: int


class Planner:
    """Simple KPI optimizer."""

    def __init__(self, stats_dir: str = "stats") -> None:
        self.stats_dir = Path(stats_dir)
        self.stats_dir.mkdir(exist_ok=True)
        self.history: List[StreamStats] = []
        self._load()

    def _load(self) -> None:
        for fp in self.stats_dir.glob("*.json"):
            data = json.loads(fp.read_text())
            self.history.append(StreamStats(**data))

    def add_stats(self, stats: StreamStats) -> None:
        self.history.append(stats)
        out = self.stats_dir / f"{stats.date}.json"
        out.write_text(json.dumps(stats.__dict__, indent=2))

    def optimize_schedule(self) -> Dict[str, Any]:
        """Return next stream recommendation."""
        if not self.history:
            return {"next_stream": "20:00", "lang": "en"}
        arr = np.array([[s.watch_time, s.revenue, s.subs] for s in self.history])
        weights = np.array([0.5, 0.3, 0.2])
        score = arr @ weights
        best = self.history[int(np.argmax(score))]
        return {"next_stream": best.date, "lang": "en"}
