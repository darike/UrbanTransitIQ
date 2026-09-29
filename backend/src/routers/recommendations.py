from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.src.data import report
from backend.src.deps import current_user, require_role
from database.models import AuditLog, RecommendationState, get_db

router = APIRouter()


@router.get("")
def list_recommendations(priority: str = None, user: dict = Depends(current_user),
                         db: Session = Depends(get_db)):
    data = report("recommendations")
    recs = data["recommendations"]
    if priority:
        recs = [r for r in recs if r["priority"].lower() == priority.lower()]
    states = {s.rec_id: s.status for s in db.query(RecommendationState).all()}
    for r in recs:
        r["status"] = states.get(r["id"], "open")
    return {"recommendations": recs, "rule": data["rule"]}


class StateIn(BaseModel):
    status: str  # accepted | dismissed | open


@router.post("/{rec_id}/status")
def set_status(rec_id: str, body: StateIn,
               user: dict = Depends(require_role("Administrator", "Operator")),
               db: Session = Depends(get_db)):
    row = db.query(RecommendationState).filter_by(rec_id=rec_id).first()
    if not row:
        row = RecommendationState(rec_id=rec_id)
        db.add(row)
    row.status = body.status
    row.updated_by = user["username"]
    db.add(AuditLog(username=user["username"], action="recommendation_status",
                    detail=f"{rec_id} -> {body.status}"))
    db.commit()
    return {"rec_id": rec_id, "status": body.status}
