from fastapi import APIRouter, Request

from ..auth.rbac import get_enforcer

router = APIRouter()


@router.get("/policy")
def list_policy(request: Request):
    request.state.decision = "allow"
    e = get_enforcer()
    return {"policy": e.get_policy()}
