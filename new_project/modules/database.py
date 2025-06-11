# Shared in-memory database for the prototype
from typing import Dict, Any

DB: Dict[str, Any] = {
    "users": {},
    "messages": [],
    "profiles": {},
    "invite_whitelist": {},
    "invites": {},
    "feedback": {},
    "announcements": [],
}
