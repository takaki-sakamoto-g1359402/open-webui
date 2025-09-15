from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session

from ..auth.models import User
from ..data.models import Mission
from ..deps import get_session, get_current_user
from ..state import controller

router = APIRouter()


class RetaskRequest(BaseModel):
    mission_id: int
    target_x: int
    target_y: int


@router.post("/agents/{agent_id}/retask")
def retask_agent(
    agent_id: int,
    req: RetaskRequest,
    request: Request,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    mission = session.get(Mission, req.mission_id)
    if not mission:
        raise HTTPException(status_code=404)
    try:
        path = controller.retask(user, mission, (req.target_x, req.target_y))
        request.state.decision = "allow"
    except PermissionError:
        request.state.decision = "deny"
        raise HTTPException(status_code=403)
    session.add(mission)
    session.commit()
    return {"path": path}
