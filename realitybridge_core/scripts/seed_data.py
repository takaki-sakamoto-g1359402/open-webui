from __future__ import annotations

from sqlalchemy import select

from realitybridge_core.db.base import Base
from realitybridge_core.db.session import SessionLocal, engine
from realitybridge_core.domain.models import Agent, Device, Space, User
from realitybridge_core.services.bootstrap import bootstrap_defaults


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        bootstrap_defaults(session)
        admin = session.execute(select(User).where(User.email == "admin@realitybridge.local")).scalar_one()
        if session.execute(select(Space).where(Space.name == "operations-hub")).scalar_one_or_none() is None:
            session.add(
                Space(
                    name="operations-hub",
                    description="Primary coordination space for remote operations.",
                    meta={"classification": "internal", "region": "simulated-us-east"},
                    owner_id=admin.id,
                )
            )
        if session.execute(select(Agent).where(Agent.name == "ops-copilot")).scalar_one_or_none() is None:
            session.add(
                Agent(
                    name="ops-copilot",
                    description="Agent scaffold for operations coordination.",
                    capabilities={"can": ["summarize", "route", "simulate-device-actions"]},
                    meta={"tier": "assistant"},
                )
            )
        if session.execute(select(Device).where(Device.name == "sim-arm-01")).scalar_one_or_none() is None:
            session.add(
                Device(
                    name="sim-arm-01",
                    device_type="robot",
                    meta={"bridge_mode": "simulation", "location": "lab-a"},
                )
            )
        session.commit()


if __name__ == "__main__":
    main()
