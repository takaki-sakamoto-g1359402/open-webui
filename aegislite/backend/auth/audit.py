from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from sqlmodel import Session

from .models import AuditLog


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware that stores an audit log for every request."""

    def __init__(self, app, engine):
        super().__init__(app)
        self.engine = engine

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        user = getattr(request.state, "user", "anonymous")
        decision = getattr(request.state, "decision", "unknown")
        policy_id = getattr(request.state, "policy_id", None)
        with Session(self.engine) as session:
            log = AuditLog(
                user=user,
                action=request.method,
                resource=str(request.url.path),
                decision=decision,
                policy_id=policy_id,
            )
            session.add(log)
            session.commit()
        return response
