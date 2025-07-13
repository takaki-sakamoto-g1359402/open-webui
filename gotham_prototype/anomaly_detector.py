"""Anomaly detection utilities."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class AnomalyDetector:
    """Detect anomalies in traffic and KPIs."""

    def detect_traffic_anomalies(self, interactions: pd.DataFrame) -> pd.DataFrame:
        """Flag anomalies in interaction volumes using IsolationForest."""
        if 'volume' not in interactions:
            logger.warning("'volume' column missing from interactions; skipping detection")
            return interactions.assign(anomaly=False)
        clf = IsolationForest(contamination=0.05, random_state=42)
        interactions = interactions.copy()
        interactions['anomaly'] = clf.fit_predict(interactions[['volume']]) == -1
        logger.info("Detected %d traffic anomalies", interactions['anomaly'].sum())
        return interactions

    def detect_kpi_anomalies(self, values: pd.Series) -> pd.DataFrame:
        """Return a DataFrame with Z-score anomalies beyond 3 sigma."""
        mean = values.mean()
        std = values.std(ddof=0)
        z = (values - mean) / std
        anomalies = z.abs() > 3
        logger.info("Detected %d KPI anomalies", anomalies.sum())
        return pd.DataFrame({'value': values, 'z_score': z, 'anomaly': anomalies})
