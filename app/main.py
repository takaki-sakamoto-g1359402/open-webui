from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, ORJSONResponse
from fastapi.templating import Jinja2Templates

from .policy_agent.agent import Agent
from .policy_agent.db import Database
from .policy_agent.planner import Planner
from .policy_agent.policy import PolicyEngine
from .policy_agent.pop import ProofOfPersonhood


app = FastAPI(title="Policy-Governed Agent", default_response_class=ORJSONResponse)
templates = Jinja2Templates(directory="templates")

db = Database()
policy_engine = PolicyEngine(db)
planner = Planner()
agent = Agent(db, planner, policy_engine)
pop_gate = ProofOfPersonhood()


@app.post("/events")
async def ingest_event(body: dict):
    payload = body.get("payload", "")
    source = body.get("source", "http")
    event_id = db.add_event(source=source, payload=payload)
    return {"id": event_id, "status": "queued"}


@app.post("/knowledge/fact")
async def add_fact(body: dict):
    key = body.get("key")
    value = body.get("value")
    source = body.get("source", "user")
    fact_id = db.add_fact(key, value, source)
    return {"id": fact_id}


@app.post("/knowledge/doc")
async def add_doc(body: dict):
    title = body.get("title")
    body_text = body.get("body")
    doc_id = db.add_doc(title, body_text)
    return {"id": doc_id}


@app.post("/agent/run")
async def run_agent(body: dict = None):
    pop_token = body.get("pop_token") if body else None
    results = agent.run_pending(pop_token=pop_token)
    return {"results": results}


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    events = db.recent_records("events")
    decisions = db.recent_records("decisions")
    actions = db.recent_records("actions")
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "events": events, "decisions": decisions, "actions": actions},
    )


@app.get("/pop/challenge")
async def pop_challenge():
    code = pop_gate.issue_challenge()
    return {"challenge": code}


@app.post("/pop/verify")
async def pop_verify(body: dict):
    code = body.get("code")
    token = pop_gate.verify(code)
    if not token:
        return {"status": "error", "reason": "invalid or expired"}
    db.store_token(token)
    return {"status": "ok", "pop_token": token}
