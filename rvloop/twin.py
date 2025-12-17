"""Digital twin logic."""
from __future__ import annotations

from datetime import datetime
from typing import Dict, Tuple

from .models import SessionLocal, TwinState


class DigitalTwinStore:
    """Manages digital twin states per source."""

    def __init__(self):
        self.db_factory = SessionLocal

    def get_state(self, source_id: str) -> TwinState:
        with self.db_factory() as session:
            state = session.get(TwinState, source_id)
            if not state:
                state = TwinState(source_id=source_id, metrics={}, rolling_stats={}, counts={})
                session.add(state)
                session.commit()
                session.refresh(state)
            return state

    def update_state(self, source_id: str, metrics: Dict[str, float], timestamp: datetime) -> Tuple[TwinState, TwinState]:
        with self.db_factory() as session:
            state = session.get(TwinState, source_id)
            if not state:
                state = TwinState(source_id=source_id, metrics={}, rolling_stats={}, counts={})
                session.add(state)
                session.flush()

            before = state.snapshot()
            new_metrics = dict(state.metrics)
            new_counts = dict(state.counts)
            new_stats = dict(state.rolling_stats)

            for key, value in metrics.items():
                prev_count = new_counts.get(key, 0)
                prev_avg = new_stats.get(key, 0.0)
                new_count = prev_count + 1
                new_avg = ((prev_avg * prev_count) + float(value)) / new_count

                new_metrics[key] = value
                new_counts[key] = new_count
                new_stats[key] = new_avg

            state.metrics = new_metrics
            state.counts = new_counts
            state.rolling_stats = new_stats

            state.updated_at = timestamp
            session.add(state)
            session.commit()
            session.refresh(state)

            after = state.snapshot()
        return before, after


def format_twin_state(state: TwinState) -> Dict[str, object]:
    return state.snapshot()
