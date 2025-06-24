import os
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel
import orjson

import world_dsl  # type: ignore
import metacog  # type: ignore

WORLD_FILE = "world.v1.json"

app = FastAPI(title="GenesisSim", default_response_class=ORJSONResponse)


def load_world() -> dict:
    """Load world state from disk."""
    with open(WORLD_FILE, "rb") as f:
        return orjson.loads(f.read())


def save_world(data: dict) -> None:
    """Persist world state to disk."""
    with open(WORLD_FILE, "wb") as f:
        f.write(orjson.dumps(data))


class EditPayload(BaseModel):
    command: str


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize world file on startup."""
    if not os.path.exists(WORLD_FILE):
        with open(WORLD_FILE, "wb") as f:
            f.write(b"{}")
    # Load once to ensure file is valid JSON
    load_world()


@app.post("/world/edit")
async def edit_world(payload: EditPayload):
    world = load_world()
    world = world_dsl.apply_edit(world, payload.command)  # TODO
    save_world(world)
    return world


@app.get("/agent/{agent_id}/metacognition")
async def get_metacognition(agent_id: str):
    return metacog.get_state(agent_id)  # TODO
