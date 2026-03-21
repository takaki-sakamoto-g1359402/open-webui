from __future__ import annotations

from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from realitybridge_core.config import Settings
from realitybridge_core.db.base import Base
from realitybridge_core.domain.models import PolicyDecision, Task, TaskRun
from realitybridge_core.services.events import InMemoryEventPublisher
from realitybridge_core.services.tasks import TaskService
from realitybridge_core.workers.event_worker import EventWorker


def test_db_driver_config_is_consistent() -> None:
    default_url = Settings.model_fields['database_url'].default
    session_source = Path('packages/core/src/realitybridge_core/db/session.py').read_text()

    assert isinstance(default_url, str)
    assert default_url.startswith('postgresql+psycopg://')
    assert 'replace(' not in session_source
    assert 'create_engine(settings.database_url' in session_source


def test_process_task_is_idempotent_and_creates_single_run() -> None:
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(bind=engine)
    task_service = TaskService(event_publisher=InMemoryEventPublisher())

    with Session(engine) as session:
        task = Task(
            agent_id='agent-1',
            submitted_by_id='user-1',
            kind='task.coordinate',
            description='test',
            payload={'risk': 1},
            sensitive=False,
        )
        session.add(task)
        session.flush()

        first = task_service.process_task(session, task)
        second = task_service.process_task(session, task)
        session.commit()

        runs = list(session.execute(select(TaskRun).where(TaskRun.task_id == task.id)).scalars())
        assert first.created is True
        assert second.created is False
        assert first.task_run.id == second.task_run.id
        assert len(runs) == 1


def test_worker_safely_skips_reprocessing_existing_run() -> None:
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(bind=engine)

    class FakeRedis:
        def xgroup_create(self, **kwargs):
            return None

        def xreadgroup(self, **kwargs):
            return []

        def xack(self, *args, **kwargs):
            return 1

    worker = EventWorker(FakeRedis())
    worker.task_service = TaskService(event_publisher=InMemoryEventPublisher())

    with Session(engine) as session:
        task = Task(
            agent_id='agent-1',
            submitted_by_id='user-1',
            kind='task.coordinate',
            description='test',
            payload={'risk': 1},
            sensitive=False,
        )
        session.add(task)
        session.flush()
        worker.task_service.process_task(session, task)
        session.commit()

        payload = {
            'event_type': 'task.submitted',
            'payload': '{"task_id":"%s"}' % task.id,
        }
        worker.handle_event(session, '1-0', payload)
        worker.handle_event(session, '2-0', payload)
        session.commit()

        runs = list(session.execute(select(TaskRun).where(TaskRun.task_id == task.id)).scalars())
        assert len(runs) == 1


def test_device_action_denied_when_policy_blocks_execution() -> None:
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(bind=engine)
    task_service = TaskService(event_publisher=InMemoryEventPublisher())

    with Session(engine) as session:
        response = task_service.request_device_action(
            session,
            actor_id='user-1',
            device_id='robot-1',
            action='device.physical.move',
            payload={'mode': 'physical'},
        )
        session.commit()

        decisions = list(session.execute(select(PolicyDecision)).scalars())
        assert response['accepted'] is False
        assert response['status'] == 'blocked'
        assert decisions[0].outcome == 'denied'


def test_device_action_approved_in_simulation_mode() -> None:
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(bind=engine)
    publisher = InMemoryEventPublisher()
    task_service = TaskService(event_publisher=publisher)

    with Session(engine) as session:
        response = task_service.request_device_action(
            session,
            actor_id='user-1',
            device_id='robot-1',
            action='device.inspect',
            payload={'mode': 'simulation', 'target': 'arm'},
        )
        session.commit()

        decisions = list(session.execute(select(PolicyDecision)).scalars())
        assert response['accepted'] is True
        assert response['mode'] == 'simulation'
        assert response['status'] == 'accepted'
        assert decisions[0].outcome == 'approved'
        assert publisher.events[0].event_type == 'robot.action.requested'
