from datetime import date, datetime, time, timedelta
from typing import List

from sqlalchemy.orm import Session

from backend.models import ScheduleRecommendation, Talent
from backend.services.risk import RiskService


SLOT_DEFINITIONS = [
    (time(19, 0), time(21, 0)),
    (time(21, 0), time(23, 0)),
    (time(23, 0), time(1, 0)),
]


class SchedulerService:
    def __init__(self, db: Session, risk_service: RiskService):
        self.db = db
        self.risk_service = risk_service

    def _week_slots(self, week_start: date) -> List[tuple[datetime, datetime]]:
        slots: List[tuple[datetime, datetime]] = []
        for offset in range(7):
            day = week_start + timedelta(days=offset)
            for slot_start_time, slot_end_time in SLOT_DEFINITIONS:
                slot_start = datetime.combine(day, slot_start_time)
                slot_end = datetime.combine(day, slot_end_time)
                if slot_end <= slot_start:
                    slot_end += timedelta(days=1)
                slots.append((slot_start, slot_end))
        return slots

    def propose_weekly_schedule(self, week_start: date) -> List[ScheduleRecommendation]:
        talents = self.db.query(Talent).all()
        slots = self._week_slots(week_start)
        recommendations: List[ScheduleRecommendation] = []

        # compute fatigue and limits
        fatigue_map = {talent.id: self.risk_service.compute_fatigue_score(talent.id) for talent in talents}
        remaining_slots: dict[int, int] = {}
        for talent in talents:
            fatigue = fatigue_map[talent.id]
            if fatigue > 80:
                remaining_slots[talent.id] = 0
            elif fatigue > 60:
                remaining_slots[talent.id] = min(2, int(talent.max_weekly_hours // 2))
            else:
                remaining_slots[talent.id] = min(6, int(talent.max_weekly_hours // 2))

        sorted_talents = sorted(talents, key=lambda t: t.priority_score, reverse=True)
        last_assigned: dict[datetime, int] = {}
        pointer = 0

        for slot_start, slot_end in slots:
            assigned = None
            attempts = 0
            while attempts < len(sorted_talents):
                talent = sorted_talents[pointer % len(sorted_talents)]
                pointer += 1
                attempts += 1
                if remaining_slots.get(talent.id, 0) <= 0:
                    continue
                if last_assigned.get(slot_start.date()) == talent.id and len(sorted_talents) > 1:
                    continue
                assigned = talent
                break

            if not assigned:
                continue

            remaining_slots[assigned.id] -= 1
            last_assigned[slot_start.date()] = assigned.id
            reason = (
                f"Priority {assigned.priority_score:.2f}, fatigue {fatigue_map[assigned.id]:.1f}"
            )
            recommendations.append(
                ScheduleRecommendation(
                    target_week_start=week_start,
                    talent_id=assigned.id,
                    slot_start=slot_start,
                    slot_end=slot_end,
                    reason=reason,
                )
            )

        self.db.query(ScheduleRecommendation).filter(
            ScheduleRecommendation.target_week_start == week_start
        ).delete()
        self.db.add_all(recommendations)
        self.db.commit()
        for rec in recommendations:
            self.db.refresh(rec)
        return recommendations

    def get_recommendations(self, week_start: date) -> List[ScheduleRecommendation]:
        return (
            self.db.query(ScheduleRecommendation)
            .filter(ScheduleRecommendation.target_week_start == week_start)
            .order_by(ScheduleRecommendation.slot_start)
            .all()
        )
