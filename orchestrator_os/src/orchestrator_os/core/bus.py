"""Simple in-memory event bus placeholder."""


class EventBus:
    def __init__(self) -> None:
        self.events: list[dict] = []

    def emit(self, event: dict) -> None:
        self.events.append(event)
