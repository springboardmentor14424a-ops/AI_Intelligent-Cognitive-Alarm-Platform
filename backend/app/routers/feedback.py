from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("", response_model=schemas.FeedbackOut)
def submit_feedback(
    payload: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    fb = models.Feedback(
        user_id=current_user.id,
        rating=max(1, min(5, payload.rating)),
        comment=payload.comment.strip()[:500],
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb
