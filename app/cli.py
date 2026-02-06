from __future__ import annotations

import argparse
import asyncio
from typing import Any

from app.orchestrator.bootstrap import build_container
from app.schemas.models import ApprovalAction, EventCreate
from app.utils.config import get_config
from app.utils.logging import configure_logging


def _parse_payload(payload: str) -> dict[str, Any]:
    import json

    return json.loads(payload)


async def _run_start(args: argparse.Namespace) -> None:
    configure_logging()
    config = get_config(args.config)
    container = build_container(config)
    await container.orchestrator.start()
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        container.orchestrator.running = False


async def _run_inject(args: argparse.Namespace) -> None:
    configure_logging()
    config = get_config(args.config)
    container = build_container(config)
    event = EventCreate(type=args.type, payload=_parse_payload(args.payload))
    record = container.events.create(event)
    await container.orchestrator.process_pending_events()
    print(record.model_dump(mode="json"))


async def _run_approve(args: argparse.Namespace) -> None:
    configure_logging()
    config = get_config(args.config)
    container = build_container(config)
    action = ApprovalAction(
        approval_id=args.approval_id,
        actor=args.actor,
        action=args.action,
        reason=args.reason,
    )
    updated = container.orchestrator.process_approval_action(
        action.approval_id,
        actor=action.actor,
        action=action.action,
        reason=action.reason,
        override_scope=action.override_scope,
        override_ttl_seconds=action.override_ttl_seconds,
    )
    await container.orchestrator.process_pending_tasks()
    print(updated.model_dump(mode="json"))



def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="AI Orchestration System CLI")
    parser.add_argument("--config", default=None, help="Path to YAML config")
    subparsers = parser.add_subparsers(dest="command", required=True)

    start = subparsers.add_parser("start", help="Run the orchestrator loop")
    start.set_defaults(func=_run_start)

    inject = subparsers.add_parser("inject", help="Inject an event")
    inject.add_argument("--type", required=True)
    inject.add_argument("--payload", required=True, help="JSON payload string")
    inject.set_defaults(func=_run_inject)

    approve = subparsers.add_parser("approve", help="Approve or deny a pending approval")
    approve.add_argument("--approval-id", type=int, required=True)
    approve.add_argument("--action", choices=["approve", "deny", "request_alternative"], default="approve")
    approve.add_argument("--actor", default="ceo")
    approve.add_argument("--reason", default=None)
    approve.set_defaults(func=_run_approve)

    return parser


async def _main_async() -> None:
    parser = build_parser()
    args = parser.parse_args()
    await args.func(args)


def main() -> None:
    asyncio.run(_main_async())


if __name__ == "__main__":
    main()
