"""FastAPI routes exposing heartbeat and task APIs."""
import asyncio
from fastapi import FastAPI
from .core import orchestrator as orch_mod
from .core.schemas import Heartbeat, Task

app = FastAPI()
orch = orch_mod.Orchestrator()

@app.on_event("startup")
async def startup_event() -> None:
    asyncio.create_task(orch.replanner())

@app.on_event("shutdown")
async def shutdown_event() -> None:
    await orch.shutdown()

@app.post("/heartbeat")
async def heartbeat(data: Heartbeat) -> dict:
    await orch.update_robot(data)
    await orch.assign_task()
    return {"status": "ok"}

@app.post("/task")
async def new_task(task: Task) -> dict:
    await orch.add_task(task)
    await orch.assign_task()
    return {"queued": task.id}

