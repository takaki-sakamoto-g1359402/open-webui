"""FastAPI application entry point."""

from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    """Root endpoint placeholder."""
    return {"message": "Hello from genesis_sim"}
