from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from realitybridge_core.api.deps import DBSession, get_current_user, require_admin
from realitybridge_core.config import Settings, get_settings
from realitybridge_core.domain.enums import AuditSeverity
from realitybridge_core.domain.models import (
    Agent,
    AuditLog,
    Device,
    DigitalTwin,
    Participant,
    Policy,
    PolicyDecision,
    PresenceSession,
    RobotBridge,
    Role,
    Space,
    Task,
    TaskRun,
    User,
)
from realitybridge_core.domain.schemas import (
    AgentCreate,
    AgentRead,
    AuditLogRead,
    DeviceCreate,
    DeviceRead,
    DigitalTwinCreate,
    DigitalTwinRead,
    HealthResponse,
    LoginRequest,
    ParticipantCreate,
    ParticipantRead,
    PolicyCreate,
    PolicyDecisionRead,
    PolicyRead,
    ReadinessResponse,
    RobotBridgeCreate,
    RobotBridgeRead,
    SessionCreate,
    SessionRead,
    SpaceCreate,
    SpaceRead,
    TaskCreate,
    TaskRead,
    TaskRunRead,
    TokenResponse,
    UserCreate,
    UserRead,
)
from realitybridge_core.services.audit import record_audit
from realitybridge_core.services.auth import auth_service
from realitybridge_core.services.bootstrap import bootstrap_defaults
from realitybridge_core.services.events import DomainEvent
from realitybridge_core.services.tasks import TaskProcessingConflict, TaskService

settings = get_settings()
router = APIRouter()
auth_router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])
spaces_router = APIRouter(prefix="/spaces", tags=["spaces"])
sessions_router = APIRouter(prefix="/sessions", tags=["sessions"])
twins_router = APIRouter(prefix="/twins", tags=["digital-twins"])
agents_router = APIRouter(prefix="/agents", tags=["agents"])
tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])
policies_router = APIRouter(prefix="/policies", tags=["policies"])
devices_router = APIRouter(prefix="/devices", tags=["devices"])
audit_router = APIRouter(prefix="/audit", tags=["audit"])
health_router = APIRouter(tags=["health"])


def get_task_service(request: Request) -> TaskService:
    return request.app.state.task_service  # type: ignore[no-any-return]


def bootstrap_allowed(active_settings: Settings) -> bool:
    return active_settings.enable_bootstrap and active_settings.env in {"development", "test"}


@auth_router.post("/bootstrap", response_model=TokenResponse, include_in_schema=False)
def bootstrap(session: DBSession) -> TokenResponse:
    if not bootstrap_allowed(settings):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bootstrap is disabled.")
    bootstrap_defaults(session)
    session.commit()
    admin = session.execute(
        select(User).options(selectinload(User.role)).where(User.email == settings.bootstrap_admin_email)
    ).scalar_one()
    return TokenResponse(access_token=auth_service.create_access_token(admin.id, admin.role.name))


@auth_router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, session: DBSession) -> TokenResponse:
    user = auth_service.authenticate(session, payload.email, payload.password)
    session.refresh(user, ["role"])
    return TokenResponse(access_token=auth_service.create_access_token(user.id, user.role.name))


@users_router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    session: DBSession,
    current_user: User = Depends(require_admin),
) -> User:
    role = session.execute(select(Role).where(Role.name == payload.role_name)).scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=auth_service.hash_password(payload.password),
        identity_type=payload.identity_type.value,
        role_id=role.id,
    )
    session.add(user)
    session.flush()
    record_audit(
        session,
        actor_type="user",
        actor_id=current_user.id,
        action="user.created",
        target_type="user",
        target_id=user.id,
        severity=AuditSeverity.INFO.value,
    )
    session.commit()
    session.refresh(user)
    session.refresh(user, ["role"])
    return user


@users_router.get("", response_model=list[UserRead])
def list_users(session: DBSession, _: User = Depends(get_current_user)) -> list[User]:
    result = session.execute(select(User).options(selectinload(User.role)).order_by(User.email))
    return list(result.scalars())


@spaces_router.post("", response_model=SpaceRead, status_code=status.HTTP_201_CREATED)
def create_space(payload: SpaceCreate, session: DBSession, current_user: User = Depends(get_current_user)) -> Space:
    space = Space(name=payload.name, description=payload.description, meta=payload.metadata, owner_id=current_user.id)
    session.add(space)
    session.flush()
    record_audit(
        session,
        actor_type="user",
        actor_id=current_user.id,
        action="space.created",
        target_type="space",
        target_id=space.id,
        severity=AuditSeverity.INFO.value,
        details=payload.metadata,
    )
    session.commit()
    return space


@spaces_router.get("", response_model=list[SpaceRead])
def list_spaces(session: DBSession, _: User = Depends(get_current_user)) -> list[Space]:
    result = session.execute(select(Space).order_by(Space.name))
    return list(result.scalars())


@sessions_router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, session: DBSession, current_user: User = Depends(get_current_user)) -> PresenceSession:
    db_session = PresenceSession(space_id=payload.space_id, started_by_id=current_user.id, meta=payload.metadata)
    session.add(db_session)
    session.flush()
    record_audit(
        session,
        actor_type="user",
        actor_id=current_user.id,
        action="session.created",
        target_type="session",
        target_id=db_session.id,
        severity=AuditSeverity.INFO.value,
    )
    session.commit()
    return db_session


@sessions_router.post("/{session_id}/participants", response_model=ParticipantRead, status_code=status.HTTP_201_CREATED)
def add_participant(session_id: str, payload: ParticipantCreate, session: DBSession, current_user: User = Depends(get_current_user), task_service: TaskService = Depends(get_task_service)) -> Participant:
    participant = Participant(
        session_id=session_id,
        subject_type=payload.subject_type.value,
        subject_id=payload.subject_id,
        role=payload.role.value,
        meta=payload.metadata,
    )
    session.add(participant)
    session.flush()
    task_service.event_publisher.publish(
        DomainEvent(
            event_type="space.user_joined",
            aggregate_id=session_id,
            payload={"session_id": session_id, "subject_id": payload.subject_id, "role": payload.role.value},
            actor_id=current_user.id,
        )
    )
    session.commit()
    return participant


@sessions_router.get("", response_model=list[SessionRead])
def list_sessions(session: DBSession, _: User = Depends(get_current_user)) -> list[PresenceSession]:
    result = session.execute(select(PresenceSession).order_by(PresenceSession.created_at.desc()))
    return list(result.scalars())


@twins_router.post("", response_model=DigitalTwinRead, status_code=status.HTTP_201_CREATED)
def create_twin(payload: DigitalTwinCreate, session: DBSession, current_user: User = Depends(get_current_user), task_service: TaskService = Depends(get_task_service)) -> DigitalTwin:
    twin = DigitalTwin(
        space_id=payload.space_id,
        name=payload.name,
        twin_type=payload.twin_type.value,
        source_ref=payload.source_ref,
        meta=payload.metadata,
    )
    session.add(twin)
    session.flush()
    task_service.event_publisher.publish(
        DomainEvent(
            event_type="digital_twin.registered",
            aggregate_id=twin.id,
            payload={"space_id": twin.space_id, "twin_id": twin.id},
            actor_id=current_user.id,
        )
    )
    session.commit()
    return twin


@twins_router.get("", response_model=list[DigitalTwinRead])
def list_twins(session: DBSession, _: User = Depends(get_current_user)) -> list[DigitalTwin]:
    result = session.execute(select(DigitalTwin).order_by(DigitalTwin.created_at.desc()))
    return list(result.scalars())


@agents_router.post("", response_model=AgentRead, status_code=status.HTTP_201_CREATED)
def create_agent(payload: AgentCreate, session: DBSession, _: User = Depends(get_current_user)) -> Agent:
    agent = Agent(
        name=payload.name,
        description=payload.description,
        capabilities=payload.capabilities,
        meta=payload.metadata,
    )
    session.add(agent)
    session.commit()
    return agent


@agents_router.get("", response_model=list[AgentRead])
def list_agents(session: DBSession, _: User = Depends(get_current_user)) -> list[Agent]:
    result = session.execute(select(Agent).order_by(Agent.name))
    return list(result.scalars())


@tasks_router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, request: Request, session: DBSession, current_user: User = Depends(get_current_user), task_service: TaskService = Depends(get_task_service)) -> Task:
    task = Task(
        agent_id=payload.agent_id,
        space_id=payload.space_id,
        submitted_by_id=current_user.id,
        kind=payload.kind,
        description=payload.description,
        payload=payload.payload,
        sensitive=payload.sensitive,
    )
    task_service.submit_task(session, task=task, actor_id=current_user.id, request_id=request.state.request_id)
    session.commit()
    return task


@tasks_router.get("", response_model=list[TaskRead])
def list_tasks(session: DBSession, _: User = Depends(get_current_user)) -> list[Task]:
    result = session.execute(select(Task).order_by(Task.created_at.desc()))
    return list(result.scalars())


@tasks_router.post("/{task_id}/process", response_model=TaskRunRead)
def process_task(task_id: str, session: DBSession, _: User = Depends(get_current_user), task_service: TaskService = Depends(get_task_service)) -> TaskRun:
    task = session.execute(select(Task).where(Task.id == task_id)).scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        process_result = task_service.process_task(session, task)
    except TaskProcessingConflict as exc:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message) from exc
    session.commit()
    return process_result.task_run


@tasks_router.get("/{task_id}/runs", response_model=list[TaskRunRead])
def list_task_runs(task_id: str, session: DBSession, _: User = Depends(get_current_user)) -> list[TaskRun]:
    result = session.execute(
        select(TaskRun).where(TaskRun.task_id == task_id).order_by(TaskRun.created_at.desc())
    )
    return list(result.scalars())


@policies_router.post("", response_model=PolicyRead, status_code=status.HTTP_201_CREATED)
def create_policy(payload: PolicyCreate, session: DBSession, _: User = Depends(require_admin)) -> Policy:
    policy = Policy(
        name=payload.name,
        description=payload.description,
        effect=payload.effect.value,
        applies_to=payload.applies_to,
        rules=payload.rules,
        active=payload.active,
    )
    session.add(policy)
    session.commit()
    return policy


@policies_router.get("", response_model=list[PolicyRead])
def list_policies(session: DBSession, _: User = Depends(get_current_user)) -> list[Policy]:
    result = session.execute(select(Policy).order_by(Policy.name))
    return list(result.scalars())


@policies_router.get("/decisions", response_model=list[PolicyDecisionRead])
def list_policy_decisions(session: DBSession, _: User = Depends(get_current_user)) -> list[PolicyDecision]:
    result = session.execute(select(PolicyDecision).order_by(PolicyDecision.created_at.desc()))
    return list(result.scalars())


@devices_router.post("", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
def create_device(payload: DeviceCreate, session: DBSession, _: User = Depends(get_current_user)) -> Device:
    device = Device(
        space_id=payload.space_id,
        name=payload.name,
        device_type=payload.device_type.value,
        meta=payload.metadata,
    )
    session.add(device)
    session.commit()
    return device


@devices_router.get("", response_model=list[DeviceRead])
def list_devices(session: DBSession, _: User = Depends(get_current_user)) -> list[Device]:
    result = session.execute(select(Device).order_by(Device.name))
    return list(result.scalars())


@devices_router.post("/bridges", response_model=RobotBridgeRead, status_code=status.HTTP_201_CREATED)
def create_bridge(payload: RobotBridgeCreate, session: DBSession, _: User = Depends(get_current_user)) -> RobotBridge:
    bridge = RobotBridge(
        device_id=payload.device_id,
        name=payload.name,
        mode=payload.mode.value,
        adapter=payload.adapter,
        meta=payload.metadata,
    )
    session.add(bridge)
    session.commit()
    return bridge


@devices_router.get("/bridges", response_model=list[RobotBridgeRead])
def list_bridges(session: DBSession, _: User = Depends(get_current_user)) -> list[RobotBridge]:
    result = session.execute(select(RobotBridge).order_by(RobotBridge.name))
    return list(result.scalars())


@audit_router.get("/logs", response_model=list[AuditLogRead])
def list_audit_logs(session: DBSession, _: User = Depends(get_current_user)) -> list[AuditLog]:
    result = session.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100))
    return list(result.scalars())


@health_router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", app=settings.app_name, simulation_mode=settings.simulation_mode)


@health_router.get("/ready", response_model=ReadinessResponse)
def ready(session: DBSession, request: Request) -> ReadinessResponse:
    session.execute(select(Role).limit(1))
    redis_status = "ready"
    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is not None:
        try:
            redis_client.ping()
        except Exception:
            redis_status = "degraded"
    return ReadinessResponse(status="ready", database="ready", redis=redis_status)


router.include_router(auth_router)
router.include_router(users_router)
router.include_router(spaces_router)
router.include_router(sessions_router)
router.include_router(twins_router)
router.include_router(agents_router)
router.include_router(tasks_router)
router.include_router(policies_router)
router.include_router(devices_router)
router.include_router(audit_router)
router.include_router(health_router)
