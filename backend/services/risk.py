from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from backend.models import ActivityLog, SelfReport


class RiskService:
    def __init__(self, db: Session):
        self.db = db

    def compute_fatigue_score(self, talent_id: int, now: datetime | None = None) -> float:
        now = now or datetime.utcnow()
        window_start = now - timedelta(days=7)

        logs = (
            self.db.query(ActivityLog)
            .filter(ActivityLog.talent_id == talent_id, ActivityLog.start_time >= window_start)
            .all()
        )
        total_hours = sum((log.end_time - log.start_time).total_seconds() / 3600 for log in logs)
        late_night_sessions = sum(1 for log in logs if log.end_time.hour >= 1)

        moods = (
            self.db.query(SelfReport)
            .filter(SelfReport.talent_id == talent_id, SelfReport.timestamp >= window_start)
            .all()
        )
        avg_mood = sum(report.mood for report in moods) / len(moods) if moods else 3.0

        hours_component = min(1.0, total_hours / 50.0)
        late_component = min(1.0, late_night_sessions / 7.0)
        mood_component = 1.0 - ((avg_mood - 1) / 4.0)

        score_0_1 = 0.5 * hours_component + 0.2 * late_component + 0.3 * mood_component
        fatigue_score = round(score_0_1 * 100, 1)
        return fatigue_score
