import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.config import settings
from app.core.email_utils import TEMPLATES, send_system_notification
from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.schemas.complaint import ComplaintCreate, ComplaintOut, ComplaintUpdate
from app.services import complaint_service
from app.core.permissions import require_role
from app.core.constants import ROLE_HR, ROLE_ADMIN
from app.models.user import User

router = APIRouter(prefix="/complaints", tags=["Complaints"])


# create a new complaint and send notification to HR
@router.post("/", response_model=ComplaintOut)
def create(data: ComplaintCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = complaint_service.create_complaint(db, current_user.id, data)

    if data.is_anonymous:
        reporter_name = "Anonymous Employee Submission"
    else:
        reporter_name = f"{current_user.full_name} (ID: {current_user.id})"

    html = TEMPLATES["NEW_COMPLAINT"].format(
        dept=data.department,
        priority=data.priority.upper(),
        title=data.title,
        description=data.description,
        reporter=reporter_name
    )

    # Safe reference via centralized settings configuration object
    send_system_notification(
        settings.HR_DEPARTMENT_EMAIL,
        f"Grievance Filed [Priority: {data.priority.upper()}]: {data.title}",
        html
    )

    return complaint


# retrieve complaints filed by the currently logged-in user
@router.get("/me", response_model=list[ComplaintOut])
def my_complaints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return complaint_service.get_my_complaints(db, current_user.id) or []


# get all complaints with enriched reporter names (admin and hr only)
@router.get("/", response_model=List[ComplaintOut])
def get_all_complaints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    complaints = complaint_service.get_all_complaints(db)

    for c in complaints:
        if not c.is_anonymous and c.user:
            c.reporter_name = c.user.full_name
        else:
            c.reporter_name = "Anonymous"

    return complaints


# get team complaints with status filtering (admin and hr only)
@router.get("/team", response_model=list[ComplaintOut])
def team_complaints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])

    all_complaints = complaint_service.get_all_complaints(db) or []

    for c in all_complaints:

        if not c.is_anonymous and c.user:
            c.reporter_name = c.user.full_name
        else:
            c.reporter_name = "Anonymous"

        if c.resolved_by_user:
            c.resolved_by_name = c.resolved_by_user.full_name

    return all_complaints


# retrieve a list of all anonymous complaints (admin and hr only)
@router.get("/anonymous", response_model=list[ComplaintOut])
def anonymous_complaints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])
    return complaint_service.get_anonymous_complaints(db)


# get details for a specific complaint (access limited to owner or admin/hr)
@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_one(complaint_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = complaint_service.get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user.role not in [ROLE_HR, ROLE_ADMIN] and complaint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this complaint")

    return complaint


# update complaint details (admin and hr only)
@router.patch("/{complaint_id}", response_model=ComplaintUpdate)
def update(complaint_id: UUID, data: ComplaintUpdate, db: Session = Depends(get_db),
           current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])

    updated = complaint_service.update_complaint(db, complaint_id, data, resolved_by_id=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return updated


# quickly set a complaint status to resolved (admin and hr only)
@router.patch("/{complaint_id}/resolve", response_model=ComplaintUpdate)
def resolve_complaint(complaint_id: UUID, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])
    update_data = ComplaintUpdate(status="resolved", resolution_note=None)

    # Pass the current_user.id here as well
    return complaint_service.update_complaint(db, complaint_id, update_data, resolved_by_id=current_user.id)