"""Entry point for the VTS Motion Console."""

from __future__ import annotations

import signal

from .ui import AsyncioLoopThread, MotionConsoleUI
from .vts_client import create_vts_client


def main() -> None:
    loop_thread = AsyncioLoopThread()
    ui = MotionConsoleUI(loop_thread)

    callbacks = ui.create_callbacks()
    client = create_vts_client(loop_thread.loop, callbacks=callbacks)
    ui.set_client(client)

    def shutdown(*_args) -> None:
        if client:
            client.disconnect()
        loop_thread.stop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, shutdown)
        except ValueError:
            # Signals are not available on all platforms (e.g. Windows when run from IDLE)
            pass

    try:
        ui.run()
    finally:
        shutdown()
        loop_thread.join(timeout=1.0)


if __name__ == "__main__":
    main()
