"""Main loop implementing self-evolution logic."""

from typing import Dict

from .memory_engine import MemoryEngine
from .persona_core import PersonaCore
from .lang_processor import LanguageProcessor

class Evolver:
    """Coordinate memory, persona and language model."""

    def __init__(self) -> None:
        self.memory = MemoryEngine()
        self.persona = PersonaCore()
        self.lang = LanguageProcessor()

    def handle_user_input(self, user_input: str) -> str:
        """Process user text and return AI response."""
        history = self.memory.recall(user_input)
        context: Dict = {
            "history": history,
            "persona": self.persona.persona.traits,
        }
        reply = self.lang.generate_reply(user_input, context)
        # TODO: evaluate reply and update persona/memory
        return reply
