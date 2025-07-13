"""Pseudo-authentication and role management."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

USERS: Dict[str, Dict[str, str]] = {
    'admin': {'password': 'admin', 'role': 'admin'},
    'analyst': {'password': 'analyst', 'role': 'analyst'},
    'viewer': {'password': 'viewer', 'role': 'viewer'},
}

@dataclass
class AuthManager:
    """Manage pseudo-login state."""

    def authenticate(self, username: str, password: str) -> Optional[str]:
        """Return the role if credentials match, else ``None``."""
        user = USERS.get(username)
        if user and user['password'] == password:
            logger.info("User %s authenticated with role %s", username, user['role'])
            return user['role']
        logger.warning("Authentication failed for user %s", username)
        return None
