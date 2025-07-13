"""Anomaly detection utilities."""

from __future__ import annotations

import logging
from typing import Tuple

import networkx as nx
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)


def detect_anomalies(interactions: pd.DataFrame) -> pd.DataFrame:
    """Detect anomalies using IsolationForest and Z-score."""
    if interactions.empty:
        return interactions
    model = IsolationForest(random_state=42)
    interactions = interactions.copy()
    model.fit(interactions[["volume"]])
    interactions["iso_anomaly"] = model.predict(interactions[["volume"]]) == -1
    mean = interactions["volume"].mean()
    std = interactions["volume"].std(ddof=0)
    interactions["zscore"] = (interactions["volume"] - mean) / (std or 1)
    interactions["z_anomaly"] = interactions["zscore"].abs() > 3
    return interactions


def mark_anomalies(graph: nx.MultiDiGraph, interactions: pd.DataFrame) -> None:
    """Mark anomalies on graph edges."""
    for _, row in interactions.iterrows():
        if row.get("iso_anomaly") or row.get("z_anomaly"):
            src = f"person_{row['source_id'] }"
            tgt = f"person_{row['target_id'] }"
            for u, v, k, data in graph.edges(src, data=True, keys=True):
                if u == src and v == tgt and data.get("timestamp") == row["timestamp"]:
                    graph.edges[u, v, k]["anomaly"] = True
