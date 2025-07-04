"""Audio interface handling speech recognition and synthesis."""

from typing import Callable

class AudioInterface:
    """Simple wrapper around speech APIs."""

    def __init__(self, on_transcript: Callable[[str], None]):
        self.on_transcript = on_transcript
        # TODO: initialize TTS and STT engines

    def process_audio_input(self, audio_bytes: bytes) -> None:
        """Convert raw audio to text and pass it to callback."""
        # TODO: call Whisper API here
        transcript = ""
        self.on_transcript(transcript)

    def speak(self, text: str) -> bytes:
        """Synthesize speech from text."""
        # TODO: integrate VALL-E or Coqui TTS
        return b""
