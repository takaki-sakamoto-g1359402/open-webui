"""Manage Re:Ai's persona and emotional state."""

from dataclasses import dataclass, field
from typing import Dict

@dataclass
class Persona:
    """Represents mutable persona parameters."""
    traits: Dict[str, float] = field(default_factory=dict)
    memories: Dict[str, str] = field(default_factory=dict)

class PersonaCore:
    """Core logic for updating persona based on interactions."""

    def __init__(self) -> None:
        self.persona = Persona()

    def update_from_feedback(self, feedback: Dict[str, float]) -> None:
        """Update persona traits according to feedback metrics."""
        for key, delta in feedback.items():
            self.persona.traits[key] = self.persona.traits.get(key, 0.0) + delta
