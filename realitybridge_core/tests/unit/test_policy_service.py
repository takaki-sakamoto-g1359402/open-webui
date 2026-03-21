from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from realitybridge_core.db.base import Base
from realitybridge_core.domain.models import Policy, Task
from realitybridge_core.services.policy import policy_service


def test_policy_service_blocks_high_risk_task() -> None:
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(bind=engine)

    with Session(engine) as session:
        session.add(
            Policy(
                name='risk-cap',
                description='Blocks high risk',
                effect='allow',
                applies_to='task.coordinate',
                rules={'max_risk': 3},
                active=True,
            )
        )
        task = Task(
            agent_id='agent-1',
            submitted_by_id='user-1',
            kind='task.coordinate',
            description='test',
            payload={'risk': 9},
            sensitive=False,
        )
        session.add(task)
        session.flush()

        result = policy_service.evaluate_task(session, task)
        assert result.outcome.value == 'denied'
        assert result.task_state.value == 'denied'
