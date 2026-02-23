"""Agent base classes."""

from dataclasses import dataclass


@dataclass
class Agent:
    name: str
    prompt: str
