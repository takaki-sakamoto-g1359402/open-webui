## Overview
# Voice synthesis using VITS/ElevenLabs

import os
from typing import Optional
import requests
from pydub import AudioSegment


class VoiceSynth:
    """Basic TTS wrapper."""

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("ELEVEN_API_KEY")
        self.voice = "default"

    def set_style(self, style: str) -> None:
        """Set voice style preset."""
        self.voice = style

    def speak(self, text: str, filename: str) -> None:
        """Generate speech and save to file using ElevenLabs API."""
        if not self.api_key:
            raise ValueError("ElevenLabs API key required")
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice}"
        headers = {"xi-api-key": self.api_key}
        data = {"text": text, "model_id": "eleven_multilingual_v2"}
        resp = requests.post(url, json=data, headers=headers, timeout=30)
        resp.raise_for_status()
        with open(filename, "wb") as f:
            f.write(resp.content)
        # ensure playable
        AudioSegment.from_file(filename).export(filename, format="mp3")
