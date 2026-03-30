from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models import Base, Talent
from backend.services.scheduler import SchedulerService
from backend.services.risk import RiskService


def setup_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    return TestingSessionLocal()


class StubRiskService(RiskService):
    def __init__(self, scores):
        self.scores = scores

    def compute_fatigue_score(self, talent_id: int, now=None) -> float:
        return self.scores.get(talent_id, 0.0)


def test_scheduler_skips_high_fatigue():
    db = setup_db()
    rested = Talent(name="Rested", kind="ai", priority_score=0.9)
    tired = Talent(name="Tired", kind="human", priority_score=0.8)
    db.add_all([rested, tired])
    db.commit()
    db.refresh(rested)
    db.refresh(tired)

    stub_risk = StubRiskService({rested.id: 20.0, tired.id: 90.0})
    scheduler = SchedulerService(db, stub_risk)

    recommendations = scheduler.propose_weekly_schedule(date(2025, 1, 6))

    assigned_ids = {rec.talent_id for rec in recommendations}
    assert rested.id in assigned_ids
    assert tired.id not in assigned_ids
    assert len(recommendations) > 0
