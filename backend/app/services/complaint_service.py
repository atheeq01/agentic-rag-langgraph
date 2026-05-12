from datetime import timezone, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate
from uuid import UUID

# create a new complaint record
def create_complaint(db:Session,user_id:UUID,data:ComplaintCreate):
    complaint = Complaint(
        user_id=None if data.is_anonymous else user_id,
        against_user_id=data.against_user_id,
        title=data.title,
        description=data.description,
        department=data.department,
        priority=data.priority,
        is_anonymous=data.is_anonymous
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint

# retrieve all complaints in the system (ordered by date)
def get_all_complaints(db: Session):
    stmt = select(Complaint).order_by(Complaint.created_at.desc())
    return db.scalars(stmt).all()

# retrieve complaints submitted by a specific user
def get_my_complaints(db:Session,user_id:UUID):
    stmt = select(Complaint).where(
        Complaint.user_id == user_id
    ).order_by(Complaint.id.desc())
    return db.scalars(stmt).all()

# retrieve all complaints filed anonymously
def get_anonymous_complaints(db:Session):
    stmt = (select(Complaint).where(
        Complaint.is_anonymous == True
    ).order_by(Complaint.id.desc()))
    return db.scalars(stmt).all()

# fetch a single complaint details by its ID
def get_complaint_by_id(db:Session,complaint_id:UUID):
    stmt = select(Complaint).where(Complaint.id == complaint_id)
    return db.scalar(stmt)

# update the status or resolution notes of a complaint
def update_complaint(db: Session, complaint_id: UUID, data: ComplaintUpdate, resolved_by_id: UUID = None):
    stmt = select(Complaint).where(Complaint.id == complaint_id)
    complaint = db.scalar(stmt)

    if not complaint:
        return None
    if data.status:
        complaint.status = data.status

        if data.status.lower() == "resolved":
            complaint.resolved_at = datetime.now(timezone.utc)
            if resolved_by_id:
                complaint.resolved_by_id = resolved_by_id

    if data.resolution_note:
        complaint.resolution_note = data.resolution_note

    db.commit()
    db.refresh(complaint)
    return complaint