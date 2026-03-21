from sqlalchemy import select
from sqlalchemy.orm import Session

from realitybridge_core.config import get_settings
from realitybridge_core.domain.enums import IdentityType, PolicyEffect
from realitybridge_core.domain.models import Policy, Role, User
from realitybridge_core.services.auth import auth_service

settings = get_settings()


def bootstrap_defaults(session: Session) -> None:
    role_names = {
        "admin": "Platform administrator",
        "operator": "Space and workflow operator",
        "observer": "Read-only observer",
        "agent": "Autonomous or assistant agent identity",
        "device": "Device or bridge identity",
    }
    for name, description in role_names.items():
        if session.execute(select(Role).where(Role.name == name)).scalar_one_or_none() is None:
            session.add(Role(name=name, description=description))
    session.flush()

    admin_role = session.execute(select(Role).where(Role.name == "admin")).scalar_one()
    existing_admin = session.execute(select(User).where(User.email == settings.bootstrap_admin_email)).scalar_one_or_none()
    if existing_admin is None:
        session.add(
            User(
                email=settings.bootstrap_admin_email,
                full_name="Bootstrap Admin",
                hashed_password=auth_service.hash_password(settings.bootstrap_admin_password),
                identity_type=IdentityType.ADMIN.value,
                role_id=admin_role.id,
            )
        )

    baseline_policies = [
        {
            "name": "default-safe-task",
            "description": "Allows ordinary simulation-safe tasks.",
            "effect": PolicyEffect.ALLOW.value,
            "applies_to": "task:*",
            "rules": {"max_risk": 5},
        },
        {
            "name": "device-physical-deny",
            "description": "Documents the default deny posture for physical actuation.",
            "effect": PolicyEffect.DENY.value,
            "applies_to": "device.physical",
            "rules": {"mode": "physical"},
        },
    ]
    for baseline in baseline_policies:
        if session.execute(select(Policy).where(Policy.name == baseline["name"])).scalar_one_or_none() is None:
            session.add(Policy(**baseline, active=True))
