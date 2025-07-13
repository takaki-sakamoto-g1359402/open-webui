"""Simple role-based access control."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import streamlit as st


@dataclass
class User:
    """Represents a user session."""

    name: str
    role: str


def login(username: str, role: str) -> User:
    """Login and store user in session state."""
    user = User(username, role)
    st.session_state.user = user
    return user


def current_user() -> Optional[User]:
    """Return the current user if logged in."""
    return st.session_state.get("user")


def has_role(required: str) -> bool:
    """Check if current user has the required role."""
    user = current_user()
    return bool(user and user.role == required)
