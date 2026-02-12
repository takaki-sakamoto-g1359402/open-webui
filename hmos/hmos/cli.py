from __future__ import annotations

import argparse
import sys

import uvicorn

from hmos.event_bus import InMemoryEventBus
from hmos.orchestrator import Orchestrator
from hmos.settings import settings
from hmos.storage import Storage


def main() -> None:
    parser = argparse.ArgumentParser(prog="hmos", description="HybridMind OS MVP")
    subparsers = parser.add_subparsers(dest="command")

    run_parser = subparsers.add_parser("run", help="Run a goal")
    run_parser.add_argument("--goal", required=True)

    serve_parser = subparsers.add_parser("serve", help="Run the FastAPI server")
    serve_parser.add_argument("--host", default=settings.bind_host)
    serve_parser.add_argument("--port", type=int, default=settings.bind_port)

    args = parser.parse_args()

    if args.command == "run":
        storage = Storage(settings.sqlite_path)
        event_bus = InMemoryEventBus()
        orchestrator = Orchestrator(storage, event_bus, settings)
        result = orchestrator.run(args.goal)
        print(f"Run {result.run_id} status={result.status.value} trace={result.trace_id}")
        return

    if args.command == "serve":
        uvicorn.run("hmos.api:app", host=args.host, port=args.port)
        return

    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
