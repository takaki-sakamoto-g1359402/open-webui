"""Generate sample CSV data for demonstration."""

from __future__ import annotations

import logging
from pathlib import Path
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "sample_data"


def generate_contacts(n: int = 5) -> pd.DataFrame:
    """Generate a contacts DataFrame."""
    df = pd.DataFrame({
        'id': [f"p{i}" for i in range(n)],
        'name': [f"Person {i}" for i in range(n)],
        'role': ['role'] * n,
        'org': ['org'] * n,
        'email': [f"p{i}@example.com" for i in range(n)],
    })
    return df


def generate_interactions(n: int = 10) -> pd.DataFrame:
    """Generate an interactions DataFrame."""
    rng = np.random.default_rng(42)
    df = pd.DataFrame({
        'source_id': rng.choice([f"p{i}" for i in range(5)], n),
        'target_id': rng.choice([f"p{i}" for i in range(5)], n),
        'timestamp': pd.date_range('2024-01-01', periods=n, freq='D'),
        'channel': rng.choice(['email', 'sms', 'call'], n),
        'volume': rng.integers(1, 100, n),
    })
    return df


def generate_events(n: int = 3) -> pd.DataFrame:
    """Generate an events DataFrame."""
    df = pd.DataFrame({
        'event_id': [f"e{i}" for i in range(n)],
        'name': [f"Event {i}" for i in range(n)],
        'location': [f"Location {i}" for i in range(n)],
        'start_time': pd.date_range('2024-01-01', periods=n, freq='W'),
        'end_time': pd.date_range('2024-01-02', periods=n, freq='W'),
        'participants': [';'.join([f"p{i}" for i in range(5)]) for _ in range(n)],
    })
    return df


def write_csvs(path: Path = DATA_DIR) -> None:
    """Write generated data to CSV files."""
    path.mkdir(parents=True, exist_ok=True)
    generate_contacts().to_csv(path / 'contacts.csv', index=False)
    generate_interactions().to_csv(path / 'interactions.csv', index=False)
    generate_events().to_csv(path / 'events.csv', index=False)
    logger.info("Sample data written to %s", path)


if __name__ == "__main__":
    write_csvs()
