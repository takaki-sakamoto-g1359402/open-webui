from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend import schemas
from backend.models import Talent
from backend.services.risk import RiskService
from backend.main import get_db

router = APIRouter()


@router.get("/health")
def healthcheck():
    return {"status": "ok"}


@router.get("/talents", response_model=list[schemas.TalentRead])
def list_talents(db: Session = Depends(get_db)):
    return db.query(Talent).all()


@router.post("/talents", response_model=schemas.TalentRead)
def create_talent(payload: schemas.TalentCreate, db: Session = Depends(get_db)):
    talent = Talent(**payload.dict())
    db.add(talent)
    db.commit()
    db.refresh(talent)
    return talent


@router.get("/talents/{talent_id}/fatigue", response_model=schemas.FatigueResponse)
def fatigue_score(talent_id: int, db: Session = Depends(get_db)):
    talent = db.query(Talent).get(talent_id)
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    service = RiskService(db)
    score = service.compute_fatigue_score(talent_id)
    return {"talent_id": talent_id, "fatigue_score": score}
