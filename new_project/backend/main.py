"""FastAPI エントリポイント."""

from fastapi import FastAPI
from pydantic import ValidationError

from .core.error_handler import error_handler

from .core.db import init_db
from .routers import (
    auth,
    invite,
    profile,
    chat,
    gatekeeper,
    feedback,
    announcement,
    kyc_webhook,
)

app = FastAPI(title="Prototype Backend")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


app.add_exception_handler(ValidationError, error_handler)


app.include_router(auth.router)
app.include_router(invite.router)
app.include_router(profile.router)
app.include_router(chat.router)
app.include_router(gatekeeper.router)
app.include_router(feedback.router)
app.include_router(announcement.router)
app.include_router(kyc_webhook.router)
