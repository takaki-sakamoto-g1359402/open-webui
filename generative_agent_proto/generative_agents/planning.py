"""Planning and reconsideration for the local prototype."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from .models import (
    AgentProfile,
    DailyPlan,
    EnvironmentEvent,
    MemoryRecord,
    PlanItem,
    PlanItemStatus,
    ReconsiderationDecision,
    default_day_start,
    make_id,
    parse_datetime,
    utc_now,
)


@dataclass(frozen=True)
class ReconsiderationResult:
    """Plan reconsideration output."""

    decision: ReconsiderationDecision
    reason: str
    changed_item_id: str | None = None


def _location_for_goal(goal: str) -> str:
    lower = goal.lower()
    if any(term in lower for term in ("repair", "build", "tool", "craft")):
        return "Workshop"
    if any(term in lower for term in ("food", "garden", "plant")):
        return "Greenhouse"
    if any(term in lower for term in ("meet", "coordinate", "brief")):
        return "Town Hall"
    return "Studio"


def generate_daily_plan(
    profile: AgentProfile,
    *,
    target_date: date | None = None,
    context_memories: list[MemoryRecord] | None = None,
) -> DailyPlan:
    """Create a deterministic high-level daily plan and concrete items."""

    target_date = target_date or utc_now().date()
    start = default_day_start(target_date, hour=9)
    goals = profile.goals or ["review current priorities"]
    context_memories = context_memories or []

    items: list[PlanItem] = []
    cursor = start
    for goal in goals[:3]:
        related_ids = [memory.id for memory in context_memories[:2]]
        items.append(
            PlanItem(
                id=make_id("planitem"),
                task=f"Advance goal: {goal}",
                location=_location_for_goal(goal),
                start_time=cursor,
                duration_minutes=90,
                related_memory_ids=related_ids,
            )
        )
        cursor += timedelta(minutes=120)

    items.append(
        PlanItem(
            id=make_id("planitem"),
            task="Review outcomes and update memory",
            location="Home Base",
            start_time=cursor,
            duration_minutes=45,
        )
    )
    now = utc_now()
    return DailyPlan(
        id=make_id("plan"),
        agent_id=profile.agent_id,
        date=target_date,
        summary=f"{profile.name} focuses on {', '.join(goals[:3])}.",
        items=items,
        created_at=now,
        updated_at=now,
    )


def _event_window(event: EnvironmentEvent) -> tuple[datetime, datetime]:
    start = parse_datetime(event.metadata.get("start_time")) or event.created_at
    duration = int(event.metadata.get("duration_minutes", 45))
    return start, start + timedelta(minutes=duration)


def _windows_overlap(left_start: datetime, left_end: datetime, right_start: datetime, right_end: datetime) -> bool:
    return left_start < right_end and right_start < left_end


def find_conflicting_item(plan: DailyPlan, event: EnvironmentEvent) -> PlanItem | None:
    """Return the first pending plan item that conflicts with the event."""

    event_start, event_end = _event_window(event)
    for item in plan.items:
        if item.status not in {PlanItemStatus.PENDING, PlanItemStatus.ACTIVE}:
            continue
        same_location = item.location == event.location
        urgent = event.importance_hint >= 0.75 or "urgent" in event.tags
        if urgent and _windows_overlap(item.start_time, item.end_time, event_start, event_end):
            return item
        if same_location and _windows_overlap(item.start_time, item.end_time, event_start, event_end):
            return item
    return None


def reconsider_plan(
    profile: AgentProfile,
    plan: DailyPlan,
    event: EnvironmentEvent,
    *,
    recent_memories: list[MemoryRecord] | None = None,
) -> ReconsiderationResult:
    """Evaluate whether to continue, modify, abandon, or create a new plan."""

    recent_memories = recent_memories or []
    description = event.description.lower()
    if any(term in description for term in ("unsafe", "danger", "emergency")):
        return ReconsiderationResult(
            ReconsiderationDecision.CREATE_NEW,
            "event implies high-risk interruption requiring a new safety-first plan",
        )
    if any(boundary.lower() in description for boundary in profile.boundaries):
        return ReconsiderationResult(
            ReconsiderationDecision.ABANDON,
            "event conflicts with an explicit agent boundary",
        )
    conflicting_item = find_conflicting_item(plan, event)
    if conflicting_item:
        return ReconsiderationResult(
            ReconsiderationDecision.MODIFY,
            f"event conflicts with scheduled item '{conflicting_item.task}'",
            changed_item_id=conflicting_item.id,
        )
    if recent_memories and sum(memory.importance for memory in recent_memories[-3:]) >= 2.4:
        return ReconsiderationResult(
            ReconsiderationDecision.MODIFY,
            "recent high-importance memories suggest replanning pressure",
        )
    return ReconsiderationResult(ReconsiderationDecision.CONTINUE, "no meaningful conflict detected")


def replan_for_event(plan: DailyPlan, event: EnvironmentEvent, result: ReconsiderationResult) -> DailyPlan:
    """Modify a plan after a reconsideration decision."""

    if result.decision == ReconsiderationDecision.CONTINUE:
        return plan

    event_start, event_end = _event_window(event)
    event_duration = max(15, int((event_end - event_start).total_seconds() // 60))
    if result.decision == ReconsiderationDecision.ABANDON:
        for item in plan.items:
            if item.status in {PlanItemStatus.PENDING, PlanItemStatus.ACTIVE}:
                item.status = PlanItemStatus.ABANDONED
        plan.summary = f"{plan.summary} Abandoned after boundary conflict."
        plan.updated_at = utc_now()
        return plan

    if result.decision == ReconsiderationDecision.CREATE_NEW:
        for item in plan.items:
            if item.status in {PlanItemStatus.PENDING, PlanItemStatus.ACTIVE}:
                item.status = PlanItemStatus.ABANDONED
        plan.items.append(
            PlanItem(
                id=make_id("planitem"),
                task=f"Create safety response for: {event.description}",
                location=event.location,
                start_time=event_start,
                duration_minutes=event_duration,
                metadata={"source_event_id": event.id},
            )
        )
        plan.summary = f"Safety-first revision triggered by event {event.id}."
        plan.updated_at = utc_now()
        return plan

    conflicting = next((item for item in plan.items if item.id == result.changed_item_id), None)
    if conflicting:
        conflicting.status = PlanItemStatus.MODIFIED
        conflicting.metadata["modified_by_event_id"] = event.id

    response_item = PlanItem(
        id=make_id("planitem"),
        task=f"Respond to event: {event.description}",
        location=event.location,
        start_time=event_start,
        duration_minutes=event_duration,
        metadata={"source_event_id": event.id},
    )
    plan.items.append(response_item)
    plan.items.sort(key=lambda item: item.start_time)

    delay_cursor = event_end
    for item in plan.items:
        if item.id == response_item.id or item.status in {PlanItemStatus.COMPLETED, PlanItemStatus.ABANDONED, PlanItemStatus.MODIFIED}:
            continue
        if item.start_time < delay_cursor:
            item.start_time = delay_cursor
            delay_cursor = item.end_time + timedelta(minutes=15)

    plan.summary = f"{plan.summary} Updated for event {event.id}."
    plan.updated_at = utc_now()
    return plan
