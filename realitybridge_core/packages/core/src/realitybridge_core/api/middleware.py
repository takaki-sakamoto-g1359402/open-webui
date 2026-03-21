from __future__ import annotations

import logging
from uuid import uuid4

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from realitybridge_core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        request_id = request.headers.get(settings.request_id_header, str(uuid4()))
        correlation_id = request.headers.get("x-correlation-id", request_id)
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id
        logger.info(
            "request.started",
            extra={
                "extra": {
                    "method": request.method,
                    "path": request.url.path,
                    "request_id": request_id,
                    "correlation_id": correlation_id,
                }
            },
        )
        response: Response = await call_next(request)
        response.headers[settings.request_id_header] = request_id
        response.headers["x-correlation-id"] = correlation_id
        return response
