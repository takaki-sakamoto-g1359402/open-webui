import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname.lower(),
            'logger': record.name,
            'message': record.getMessage(),
        }
        extra = getattr(record, 'extra', None)
        if isinstance(extra, dict):
            payload.update(extra)
        return json.dumps(payload)


_logger_configured = False


def configure_logging() -> None:
    global _logger_configured
    if _logger_configured:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
    _logger_configured = True
