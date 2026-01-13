"""Helper functions for saving and loading checkpoints."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import json
import logging

logger = logging.getLogger(__name__)


def save_checkpoint(path: Path, payload: dict[str, Any]) -> None:
    """Save a checkpoint as JSON.

    Args:
        path: Output path.
        payload: Serializable payload.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2))
    logger.info("Saved checkpoint to %s", path)


def load_checkpoint(path: Path) -> dict[str, Any]:
    """Load a checkpoint from JSON."""
    if not path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {path}")
    return json.loads(path.read_text())
