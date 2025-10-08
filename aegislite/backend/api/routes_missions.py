from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from ..auth.models import User
from ..auth.rbac import check_access
from ..data.models import Mission
from ..deps import get_session, get_current_user
from ..state import planner

router = APIRouter()


@router.post("/missions/plan/{mission_id}")
def plan_mission(
    mission_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    mission = session.get(Mission, mission_id)
    if not mission:
        raise HTTPException(status_code=404)
    try:
        path = planner.plan(user, mission)
        request.state.decision = "allow"
    except PermissionError:
        request.state.decision = "deny"
        raise HTTPException(status_code=403, detail="policy-denied")
    mission.status = "planned"
    session.add(mission)
    session.commit()
    return {"path": path}


@router.post("/missions/approve/{mission_id}")
def approve_mission(
    mission_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    mission = session.get(Mission, mission_id)
    if not mission:
        raise HTTPException(status_code=404)
    if not check_access(user, "approve", mission.sensitivity):
        request.state.decision = "deny"
        raise HTTPException(status_code=403)
    mission.status = "approved"
    session.add(mission)
    session.commit()
    request.state.decision = "allow"
    return {"status": "approved"}
