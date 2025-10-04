"""Client utilities for talking to the VTube Studio WebSocket API.

This module owns the websocket connection, authentication token storage
and convenience helpers for the UI.  The goal is to expose a small
imperative surface to the Tkinter front-end while keeping the asyncio
logic contained in a dedicated event loop thread.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import websockets
from websockets import WebSocketClientProtocol


LOGGER = logging.getLogger(__name__)


@dataclass
class VTSCallbacks:
    """Callbacks used by :class:`VTSClient` to communicate with the UI."""

    on_status_change: Callable[[str], None]
    on_log: Callable[[str], None]
    on_warning: Callable[[str], None]
    on_expressions: Callable[[List[str]], None]


class VTSClient:
    """Async client that performs the VTS authentication handshake and requests."""

    API_NAME = "VTubeStudioPublicAPI"
    API_VERSION = "1.0"

    def __init__(
        self,
        loop: asyncio.AbstractEventLoop,
        uri: str,
        plugin_name: str,
        plugin_developer: str,
        callbacks: VTSCallbacks,
        token_path: Path | None = None,
    ) -> None:
        self._loop = loop
        self._uri = uri
        self._plugin_name = plugin_name
        self._plugin_developer = plugin_developer
        self._callbacks = callbacks
        self._token_path = token_path or Path(".vts_token.json")

        self._ws: Optional[WebSocketClientProtocol] = None
        self._send_lock = asyncio.Lock()
        self._connected = asyncio.Event()
        self._parameter_updates: Dict[str, float] = {}
        self._parameter_event = asyncio.Event()
        self._parameter_task: Optional[asyncio.Task[None]] = None
        self._connection_task: Optional[asyncio.Task[None]] = None
        self._last_connection_error: Optional[str] = None

    # ------------------------------------------------------------------
    # Public API used by the UI (thread-safe wrappers around coroutines)
    # ------------------------------------------------------------------
    def connect(self) -> asyncio.Future[None]:
        """Schedule a connection attempt on the background loop."""

        return asyncio.run_coroutine_threadsafe(self._connect(), self._loop)

    def disconnect(self) -> asyncio.Future[None]:
        return asyncio.run_coroutine_threadsafe(self._disconnect(), self._loop)

    def request_expressions(self) -> asyncio.Future[List[str]]:
        return asyncio.run_coroutine_threadsafe(self._request_expressions(), self._loop)

    def queue_parameter_update(self, parameter: str, value: float) -> None:
        asyncio.run_coroutine_threadsafe(
            self._queue_parameter_update(parameter, value), self._loop
        )

    def activate_expression(self, expression: str, active: bool) -> None:
        asyncio.run_coroutine_threadsafe(
            self._set_expression(expression, active), self._loop
        )

    # ------------------------------------------------------------------
    # Async implementation
    # ------------------------------------------------------------------
    async def _connect(self) -> None:
        if self._ws and not self._ws.closed:
            return
        try:
            self._log(f"Connecting to {self._uri} …")
            self._ws = await websockets.connect(self._uri)
            await self._authenticate()
            self._callbacks.on_status_change("connected")
            self._connected.set()
            self._parameter_task = asyncio.create_task(self._parameter_sender())
            await self._request_expressions()
        except Exception as exc:  # pragma: no cover - best effort logging
            message = f"Connection failed: {exc!s}"
            self._last_connection_error = message
            LOGGER.exception(message)
            self._callbacks.on_warning(message)
            self._callbacks.on_status_change("disconnected")
            await self._disconnect()

    async def _disconnect(self) -> None:
        self._connected.clear()
        if self._parameter_task:
            self._parameter_task.cancel()
            try:
                await self._parameter_task
            except asyncio.CancelledError:
                pass
            self._parameter_task = None
        if self._ws and not self._ws.closed:
            await self._ws.close()
        self._ws = None
        self._callbacks.on_status_change("disconnected")

    async def _authenticate(self) -> None:
        token = self._load_token()
        if not token:
            token = await self._request_token()
            self._save_token(token)
        await self._send_request(
            "AuthenticationRequest",
            {
                "pluginName": self._plugin_name,
                "pluginDeveloper": self._plugin_developer,
                "authenticationToken": token,
            },
        )
        self._log("Authentication successful.")

    async def _request_token(self) -> str:
        self._log("Requesting authentication token…")
        response = await self._send_request(
            "AuthenticationTokenRequest",
            {
                "pluginName": self._plugin_name,
                "pluginDeveloper": self._plugin_developer,
            },
        )
        token = response.get("authenticationToken")
        if not token:
            raise RuntimeError("VTS did not return an authenticationToken.")
        return token

    async def _request_expressions(self) -> List[str]:
        if not await self._ensure_connected():
            self._callbacks.on_expressions([])
            return []
        try:
            response = await self._send_request("ExpressionListRequest", {})
            expressions = response.get("expressions") or []
            if not expressions:
                # Fallback: some VTS builds respond with expression list on state request.
                response = await self._send_request("ExpressionStateRequest", {})
                expressions = response.get("expressions") or response.get("activeExpressions") or []
            names = self._normalize_expression_entries(expressions)
            self._callbacks.on_expressions(names)
            return names
        except Exception as exc:  # pragma: no cover - network errors
            self._callbacks.on_warning(f"Could not fetch expressions: {exc!s}")
            self._callbacks.on_expressions([])
            return []

    async def _set_expression(self, expression: str, active: bool) -> None:
        if not expression:
            return
        if not await self._ensure_connected():
            self._log(f"Dry-run: would {'activate' if active else 'deactivate'} expression {expression}")
            return
        data = {
            "expressionName": expression,
            "active": active,
            "mode": "set",
            "expressionFile": "",
        }
        try:
            await self._send_request("ExpressionStateRequest", data)
            state = "Activated" if active else "Deactivated"
            self._log(f"{state} expression: {expression}")
        except Exception as exc:
            self._callbacks.on_warning(f"Expression error: {exc!s}")

    async def _queue_parameter_update(self, parameter: str, value: float) -> None:
        value = max(0.0, min(1.0, value))
        self._parameter_updates[parameter] = value
        self._parameter_event.set()
        if not await self._ensure_connected():
            self._log(f"Dry-run parameter {parameter}={value:.2f}")

    async def _parameter_sender(self) -> None:
        try:
            while True:
                await self._parameter_event.wait()
                await asyncio.sleep(1 / 30)
                await self._flush_parameter_updates()
        except asyncio.CancelledError:
            await self._flush_parameter_updates(force=True)
            raise

    async def _flush_parameter_updates(self, force: bool = False) -> None:
        if not self._parameter_updates:
            self._parameter_event.clear()
            return
        updates = dict(self._parameter_updates)
        self._parameter_updates.clear()
        self._parameter_event.clear()
        if not await self._ensure_connected():
            return
        for param, value in updates.items():
            try:
                await self._send_request(
                    "InjectParameterDataRequest",
                    {
                        "param": param,
                        "value": value,
                        "weight": 1.0,
                        "mode": "set",
                        "id": "RiaiMotionConsole",
                    },
                )
            except Exception as exc:
                self._callbacks.on_warning(
                    f"Failed to set {param}: {exc!s}. You can edit the parameter list if needed."
                )

    async def _ensure_connected(self) -> bool:
        if not self._ws or self._ws.closed:
            return False
        return True

    async def _send_request(self, message_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        if not self._ws or self._ws.closed:
            raise RuntimeError("Not connected to VTube Studio.")
        payload = {
            "apiName": self.API_NAME,
            "apiVersion": self.API_VERSION,
            "requestID": str(uuid.uuid4()),
            "messageType": message_type,
            "data": data,
        }
        async with self._send_lock:
            await self._ws.send(json.dumps(payload))
            self._log(f"→ {message_type}")
            raw = await self._ws.recv()
        response = json.loads(raw)
        if "errorID" in response.get("data", {}):
            error = response["data"].get("message", "Unknown error")
            raise RuntimeError(error)
        return response.get("data", response)

    def _load_token(self) -> Optional[str]:
        if not self._token_path.exists():
            return None
        try:
            token_data = json.loads(self._token_path.read_text())
            return token_data.get("authenticationToken")
        except json.JSONDecodeError:
            self._callbacks.on_warning("Stored token file is invalid. Requesting a new token.")
            return None

    def _save_token(self, token: str) -> None:
        payload = {
            "authenticationToken": token,
            "createdAt": time.time(),
        }
        self._token_path.write_text(json.dumps(payload, indent=2))
        self._log(f"Saved authentication token to {self._token_path}")

    @staticmethod
    def _normalize_expression_entries(entries: List[Any]) -> List[str]:
        names: List[str] = []
        for entry in entries:
            if isinstance(entry, str):
                names.append(entry)
            elif isinstance(entry, dict):
                if entry.get("name"):
                    names.append(entry["name"])
                elif entry.get("expressionName"):
                    names.append(entry["expressionName"])
                elif entry.get("file"):
                    names.append(entry["file"])
        # Deduplicate preserving order
        seen = set()
        ordered: List[str] = []
        for name in names:
            if name in seen:
                continue
            seen.add(name)
            ordered.append(name)
        return ordered

    def _log(self, message: str) -> None:
        LOGGER.debug(message)
        self._callbacks.on_log(message)


def create_vts_client(
    loop: asyncio.AbstractEventLoop,
    callbacks: VTSCallbacks,
    uri: str = "ws://127.0.0.1:8001",
    plugin_name: str = "RiaiMotionTester",
    plugin_developer: str = "Takaki Sakamoto",
) -> VTSClient:
    """Factory that hides the default arguments and logging setup."""

    logging.basicConfig(level=logging.INFO)
    return VTSClient(
        loop=loop,
        uri=uri,
        plugin_name=plugin_name,
        plugin_developer=plugin_developer,
        callbacks=callbacks,
    )
