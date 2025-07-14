"""FastAPI server exposing roadmap generation."""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from . import aiai_p

app = FastAPI(title="AIAI-P")


class RoadmapRequest(BaseModel):
    query: str
    lang: str | None = None


@app.post("/roadmap")
def roadmap(req: RoadmapRequest) -> dict[str, str]:
    md, _, _, _ = aiai_p.run_query(req.query, "innovators.json")
    return {"markdown": md}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

