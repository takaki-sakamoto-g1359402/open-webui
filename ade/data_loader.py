"""Data ingestion and preprocessing module."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Tuple

import pandas as pd

from .generate_sample_data import create_csvs

logger = logging.getLogger(__name__)


def load_local_data(data_dir: Path = Path("data")) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load local CSV files, generating them if missing.

    Args:
        data_dir: Directory containing CSV files.

    Returns:
        Tuple of contacts, interactions, and events DataFrames.
    """
    if not data_dir.exists() or not any(data_dir.iterdir()):
        logger.info("Generating sample CSV data")
        create_csvs(data_dir)
    contacts = pd.read_csv(data_dir / "contacts.csv")
    interactions = pd.read_csv(data_dir / "interactions.csv")
    events = pd.read_csv(data_dir / "events.csv")
    return contacts, interactions, events


def load_api_users(url: str = "https://dummyjson.com/users") -> pd.DataFrame:
    """Load users from a dummy REST API endpoint.

    Args:
        url: API URL.

    Returns:
        DataFrame of users.
    """
    try:
        data = pd.read_json(url)
        users = pd.json_normalize(data["users"]) if "users" in data else data
    except Exception as exc:  # pragma: no cover - network issues
        logger.warning("Failed to fetch API users: %s", exc)
        users = pd.DataFrame()
    return users


if __name__ == "__main__":
    load_local_data()
    load_api_users()
