"""Control the 3D avatar in a WebGL or Three.js scene."""

class AvatarController:
    """API for linking avatar animations with conversation state."""

    def __init__(self) -> None:
        # TODO: setup WebSocket or other realtime channel
        pass

    def update_expression(self, emotion: str) -> None:
        """Update avatar expression based on emotion label."""
        pass

    def play_gesture(self, gesture: str) -> None:
        """Trigger a predefined gesture animation."""
        pass
