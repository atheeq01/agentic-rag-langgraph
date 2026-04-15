from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.schemas.complaint import ComplaintCreate, ComplaintOut, ComplaintUpdate
from app.services import complaint_service
from app.core.permissions import require_role
from app.core.constants import ROLE_HR, ROLE_ADMIN
from app.models.user import User

router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.post("/", response_model=ComplaintOut)
def create(data: ComplaintCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return complaint_service.create_complaint(db, current_user.id, data)


@router.get("/me", response_model=list[ComplaintOut])
def my_complaints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return complaint_service.get_my_complaints(db, current_user.id)


@router.get("/", response_model=list[ComplaintOut])
def all_complaints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])
    return complaint_service.get_all_complaints(db)


@router.get("/anonymous", response_model=list[ComplaintOut])
def anonymous_complaints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])
    return complaint_service.get_anonymous_complaints(db)


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_one(complaint_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = complaint_service.get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user.role not in [ROLE_HR, ROLE_ADMIN] and complaint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this complaint")

    return complaint


@router.patch("/{complaint_id}", response_model=ComplaintUpdate)
def update(complaint_id: UUID, data: ComplaintUpdate, db: Session = Depends(get_db),
           current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])

    updated = complaint_service.update_complaint(db, complaint_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return updated