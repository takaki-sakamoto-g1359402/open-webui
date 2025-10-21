"""Utility helpers."""
from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, Optional

from jinja2 import Environment, FileSystemLoader, Template


LOGGER_NAME = "riai"


def init_logging() -> None:
    logger = logging.getLogger(LOGGER_NAME)
    if logger.handlers:
        return
    handler = logging.StreamHandler()
    formatter = JSONLogFormatter()
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logger.setLevel(level)


class JSONLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        base: Dict[str, Any] = {
            "level": record.levelname,
            "name": record.name,
            "time": datetime.utcnow().isoformat() + "Z",
            "message": record.getMessage(),
        }
        if record.exc_info:
            base["exc_info"] = self.formatException(record.exc_info)
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            base.update(record.extra)
        return json.dumps(base, ensure_ascii=False)


def json_log(level: int, message: str, **extra: Any) -> None:
    logger = logging.getLogger(LOGGER_NAME)
    logger.log(level, message, extra={"extra": _redact_dict(extra)})


def _redact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    redacted = {}
    for key, value in data.items():
        if isinstance(value, str):
            redacted[key] = redact_text(value)
        elif isinstance(value, dict):
            redacted[key] = _redact_dict(value)
        else:
            redacted[key] = value
    return redacted


SECRET_PATTERNS = [
    re.compile(r"xox[abp]-[A-Za-z0-9-]+"),
    re.compile(r"sk-[A-Za-z0-9]{10,}"),
]


def redact_text(text: str) -> str:
    if not text:
        return text
    result = text
    for pattern in SECRET_PATTERNS:
        result = pattern.sub("[REDACTED]", result)
    return result


def detect_language(text: str) -> str:
    if not text:
        return "en"
    if re.search(r"[\u3040-\u30ff\u4e00-\u9faf]", text):
        return "ja"
    return "en"


def shorten_text(text: str, limit: int) -> str:
    if not text:
        return ""
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def render_template(path: str, context: Dict[str, Any]) -> str:
    directory, filename = os.path.split(path)
    loader = FileSystemLoader(directory or ".")
    env = Environment(loader=loader, autoescape=False)
    template: Template = env.get_template(filename)
    return template.render(**context)


def jst_now() -> datetime:
    from zoneinfo import ZoneInfo

    return datetime.now(ZoneInfo(os.getenv("TIMEZONE", "Asia/Tokyo")))


def ensure_trace_id(metadata: Optional[Dict[str, Any]]) -> str:
    if metadata and metadata.get("trace_id"):
        return metadata["trace_id"]
    return f"trace-{datetime.utcnow().timestamp()}"
