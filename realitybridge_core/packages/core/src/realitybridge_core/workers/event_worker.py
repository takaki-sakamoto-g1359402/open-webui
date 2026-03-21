from __future__ import annotations

import logging
import os
import time
from typing import Any

import orjson
from redis import Redis
from sqlalchemy import select
from sqlalchemy.orm import Session

from realitybridge_core.config import get_settings
from realitybridge_core.db.session import SessionLocal
from realitybridge_core.domain.models import EventCheckpoint, Task
from realitybridge_core.logging import configure_logging
from realitybridge_core.services.events import build_redis_client
from realitybridge_core.services.tasks import TaskProcessingConflict, TaskService

settings = get_settings()
logger = logging.getLogger(__name__)


class NonePublisher:
    def publish(self, event: Any) -> str:
        _ = event
        return os.urandom(4).hex()


class EventWorker:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.task_service = TaskService(event_publisher=NonePublisher())

    def ensure_group(self) -> None:
        try:
            self.redis.xgroup_create(
                name=settings.event_stream,
                groupname=settings.event_consumer_group,
                id="0",
                mkstream=True,
            )
        except Exception as exc:
            if "BUSYGROUP" not in str(exc):
                raise

    def run_once(self) -> bool:
        entries = self.redis.xreadgroup(
            groupname=settings.event_consumer_group,
            consumername=settings.event_consumer_name,
            streams={settings.event_stream: ">"},
            count=5,
            block=500,
        )
        if not entries:
            return False

        with SessionLocal() as session:
            for _stream, messages in entries:
                for event_id, payload in messages:
                    self.handle_event(session, event_id, payload)
                    self.redis.xack(settings.event_stream, settings.event_consumer_group, event_id)
            session.commit()
        return True

    def handle_event(self, session: Session, event_id: str, payload: dict[str, Any]) -> None:
        event_type = payload["event_type"]
        logger.info("worker.event", extra={"extra": {"event_id": event_id, "event_type": event_type}})
        if event_type == "task.submitted":
            body = orjson.loads(payload["payload"])
            task = session.execute(select(Task).where(Task.id == body["task_id"])).scalar_one_or_none()
            if task is not None:
                try:
                    process_result = self.task_service.process_task(session, task)
                    if not process_result.created:
                        logger.info(
                            "worker.task.skip_existing_run",
                            extra={"extra": {"task_id": task.id}},
                        )
                except TaskProcessingConflict as exc:
                    logger.info(
                        "worker.task.skip_conflict",
                        extra={"extra": {"task_id": task.id, "reason": exc.message}},
                    )
        checkpoint = EventCheckpoint(
            consumer_group=settings.event_consumer_group,
            consumer_name=settings.event_consumer_name,
            stream_name=settings.event_stream,
            last_event_id=event_id,
        )
        session.add(checkpoint)

    def run(self) -> None:
        self.ensure_group()
        while True:
            processed = self.run_once()
            if not processed:
                time.sleep(0.2)


def main() -> None:
    configure_logging()
    worker = EventWorker(build_redis_client())
    worker.run()
