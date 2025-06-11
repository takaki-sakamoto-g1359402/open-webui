"""In-memory DB layer."""

from typing import Generator, Dict, Any

from ...modules.database import DB


def init_db() -> None:
    """Initialize the in-memory DB (no-op)."""
    DB.setdefault("users", {})
    DB.setdefault("profiles", {})
    DB.setdefault("invites", {})
    DB.setdefault("invite_whitelist", {})
    DB.setdefault("messages", [])
    DB.setdefault("feedback", {})
    DB.setdefault("announcements", [])


def get_session() -> Generator[Dict[str, Any], None, None]:
    """Return the shared DB dictionary."""
    yield DB


get_db = get_session
