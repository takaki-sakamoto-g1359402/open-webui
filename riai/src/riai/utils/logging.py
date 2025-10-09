"""Logging utilities for Riai."""
from __future__ import annotations

import json
import logging
import sys
from typing import Any, Dict


class JsonFormatter(logging.Formatter):
    """Simple JSON log formatter."""

    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        if record.args and isinstance(record.args, dict):
            payload.update(record.args)
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(config: Dict[str, Any]) -> None:
    """Configure logging according to settings."""
    level = getattr(logging, config.get("level", "INFO"))
    json_mode = config.get("json", True)
    handler = logging.StreamHandler(sys.stdout)
    if json_mode:
        handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = [handler]


def get_logger(name: str) -> logging.Logger:
    """Get a configured logger."""
    return logging.getLogger(name)
