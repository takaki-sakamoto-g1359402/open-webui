"""Configuration parsing utilities."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class POCConfig:
    """Configuration object for the POC pipeline."""

    data_paths: dict[str, str]
    model_checkpoints: dict[str, str]
    output_dir: str


def load_config(path: Path) -> POCConfig:
    """Load configuration from YAML or JSON.

    Args:
        path: Path to a YAML or JSON configuration file.

    Returns:
        Parsed POCConfig.
    """
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    if path.suffix in {".yaml", ".yml"}:
        try:
            import yaml
        except ImportError as exc:  # pragma: no cover
            raise ImportError("PyYAML is required for YAML config parsing") from exc
        data: dict[str, Any] = yaml.safe_load(path.read_text())
    else:
        data = json.loads(path.read_text())
    logger.info("Loaded configuration from %s", path)
    return POCConfig(
        data_paths=data.get("data_paths", {}),
        model_checkpoints=data.get("model_checkpoints", {}),
        output_dir=data.get("output_dir", "outputs"),
    )
