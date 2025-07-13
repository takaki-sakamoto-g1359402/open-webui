"""Tests for anomaly detection."""

import pandas as pd

from ade import anomaly_detector


def test_detect_anomalies() -> None:
    df = pd.DataFrame({"source_id": [1], "target_id": [2], "volume": [10], "timestamp": ["2020-01-01"]})
    result = anomaly_detector.detect_anomalies(df)
    assert "iso_anomaly" in result.columns
