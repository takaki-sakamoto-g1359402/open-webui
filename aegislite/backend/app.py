from fastapi import FastAPI, Depends
from sqlmodel import select, Session

from .auth.audit import AuditMiddleware
from .deps import engine, get_session
from .api import routes_missions, routes_agents, routes_policy, routes_audit, routes_assets
from .data.models import Agent
from .state import planner, controller  # noqa: F401

app = FastAPI()
app.add_middleware(AuditMiddleware, engine=engine)

app.include_router(routes_assets.router)
app.include_router(routes_missions.router)
app.include_router(routes_agents.router)
app.include_router(routes_policy.router)
app.include_router(routes_audit.router)


@app.get("/telemetry")
def telemetry(session: Session = Depends(get_session)):
    agents = session.exec(select(Agent)).all()
    return [agent.dict() for agent in agents]
