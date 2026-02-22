from fastapi import FastAPI

app = FastAPI(title="Orchestrator MVP")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
