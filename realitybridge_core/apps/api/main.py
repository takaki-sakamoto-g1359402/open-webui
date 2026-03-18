from __future__ import annotations

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from realitybridge_core.api.middleware import RequestContextMiddleware
from realitybridge_core.api.routers import router
from realitybridge_core.db.base import Base
from realitybridge_core.db.session import SessionLocal, engine
from realitybridge_core.logging import configure_logging
from realitybridge_core.services.bootstrap import bootstrap_defaults
from realitybridge_core.services.events import RedisStreamEventPublisher, build_redis_client
from realitybridge_core.services.tasks import TaskService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        bootstrap_defaults(session)
        session.commit()

    redis_client = build_redis_client()
    app.state.redis = redis_client
    app.state.task_service = TaskService(event_publisher=RedisStreamEventPublisher(redis_client))
    logger.info("api.started", extra={"extra": {"component": "api"}})
    yield
    redis_client.close()
    engine.dispose()
    logger.info("api.stopped", extra={"extra": {"component": "api"}})


app = FastAPI(
    title="RealityBridge Core API",
    version="0.1.0",
    description="Safety-first scaffold for remote presence, agents, twins, and simulation-only device bridges.",
    lifespan=lifespan,
)
app.add_middleware(RequestContextMiddleware)
app.include_router(router, prefix="/api/v1")
