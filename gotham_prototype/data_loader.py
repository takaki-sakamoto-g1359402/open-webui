"""Data ingestion utilities."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional
import pandas as pd
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DataLoader:
    """Load data from CSV files or REST APIs."""

    base_url: Optional[str] = None

    def load_csv(self, path: str) -> pd.DataFrame:
        """Return a DataFrame loaded from a CSV file.

        Parameters
        ----------
        path : str
            Path to the CSV file.

        Returns
        -------
        pandas.DataFrame
            Loaded DataFrame.
        """
        logger.info("Loading CSV from %s", path)
        return pd.read_csv(path)

    def load_api(self, endpoint: str) -> pd.DataFrame:
        """Return a DataFrame loaded from a REST API endpoint.

        Parameters
        ----------
        endpoint : str
            Endpoint to fetch data from.

        Returns
        -------
        pandas.DataFrame
            DataFrame parsed from JSON response.
        """
        if not self.base_url:
            raise ValueError("base_url is not set for API loading")
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        logger.info("Fetching data from API: %s", url)
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return pd.DataFrame(data)
