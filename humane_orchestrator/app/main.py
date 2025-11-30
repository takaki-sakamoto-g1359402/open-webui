from __future__ import annotations

from fastapi import FastAPI

from . import api

app = FastAPI(title="Humane AI Orchestrator", version="0.1.0")
app.include_router(api.router)


@app.get("/")
def healthcheck():
    return {"status": "ok"}


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

