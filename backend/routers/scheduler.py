from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend import schemas
from backend.services.risk import RiskService
from backend.services.scheduler import SchedulerService
from backend.main import get_db

router = APIRouter()


@router.post("/scheduler/run", response_model=list[schemas.ScheduleRecommendationRead])
def run_scheduler(payload: schemas.SchedulerRunRequest, db: Session = Depends(get_db)):
    risk_service = RiskService(db)
    scheduler = SchedulerService(db, risk_service)
    return scheduler.propose_weekly_schedule(payload.week_start)


@router.get("/scheduler/recommendations", response_model=list[schemas.ScheduleRecommendationRead])
def list_recommendations(week_start: str, db: Session = Depends(get_db)):
    week_date = date.fromisoformat(week_start)
    risk_service = RiskService(db)
    scheduler = SchedulerService(db, risk_service)
    return scheduler.get_recommendations(week_date)
