from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models import Base, Talent, ActivityLog, SelfReport
from backend.services.risk import RiskService


def setup_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    return TestingSessionLocal()


def test_fatigue_score_reflects_hours_and_mood():
    db = setup_db()
    talent = Talent(name="Test", kind="human", priority_score=0.5)
    db.add(talent)
    db.commit()
    db.refresh(talent)

    now = datetime(2025, 1, 10, 12, 0, 0)
    heavy_day_1 = ActivityLog(
        talent_id=talent.id,
        start_time=datetime(2025, 1, 9, 0, 0, 0),
        end_time=datetime(2025, 1, 9, 22, 0, 0),
        type="stream",
    )
    heavy_day_2 = ActivityLog(
        talent_id=talent.id,
        start_time=datetime(2025, 1, 8, 0, 0, 0),
        end_time=datetime(2025, 1, 8, 22, 0, 0),
        type="stream",
    )
    late_night = ActivityLog(
        talent_id=talent.id,
        start_time=datetime(2025, 1, 10, 0, 0, 0),
        end_time=datetime(2025, 1, 10, 2, 0, 0),
        type="stream",
    )
    db.add_all([heavy_day_1, heavy_day_2, late_night, SelfReport(talent_id=talent.id, mood=2)])
    db.commit()

    service = RiskService(db)
    score = service.compute_fatigue_score(talent.id, now=now)
    assert score > 70
    assert score < 90
