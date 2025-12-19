import json
from pathlib import Path


WORLD_FILE = Path("world.v1.json")


def load_world() -> dict:
    if not WORLD_FILE.exists():
        WORLD_FILE.write_text(json.dumps({"created": True}), encoding="utf-8")
    return json.loads(WORLD_FILE.read_text())


def apply_edit(world: dict, command: str) -> dict:
    world = world or {}
    history = world.get("history", [])
    history.append(command)
    world["history"] = history
    WORLD_FILE.write_text(json.dumps(world), encoding="utf-8")
    return world
