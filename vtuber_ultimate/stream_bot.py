## Overview
# OBS and streaming platform control

import os
import json
from typing import Any
from obswebsocket import obsws, requests as obs_req
import websockets


class StreamBot:
    """Control OBS and read chat APIs."""

    def __init__(self, host: str = "localhost", port: int = 4455, password: str | None = None) -> None:
        self.host = host
        self.port = port
        self.password = password or os.getenv("OBS_PASSWORD", "")
        self.ws = obsws(self.host, self.port, self.password)

    def connect(self) -> None:
        self.ws.connect()

    def change_scene(self, scene_name: str) -> None:
        self.ws.call(obs_req.SetCurrentProgramScene(scene_name))

    def disconnect(self) -> None:
        self.ws.disconnect()

    async def highlight_chat(self, message: str) -> None:
        """Placeholder for chat highlight via websockets."""
        url = os.getenv("CHAT_WS")
        if not url:
            return
        async with websockets.connect(url) as ws:
            await ws.send(json.dumps({"highlight": message}))
