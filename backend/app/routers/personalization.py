from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import personalization_service

router = APIRouter(prefix="/api/personalization", tags=["personalization"])


@router.get("", response_model=schemas.PersonalizationOut)
def get_personalization(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    data = personalization_service.build_personalization(db, current_user)
    return schemas.PersonalizationOut(**data)
