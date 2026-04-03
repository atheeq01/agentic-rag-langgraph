from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate
from uuid import UUID

def create_complaint(db:Session,user_id:UUID,data:ComplaintCreate):
    complaint = Complaint(
        user_id=None if data.is_anonymous else user_id,
        against_user_id=data.against_user_id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        is_anonymous=data.is_anonymous
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint

def get_all_complaints(db: Session):
    stmt = select(Complaint).order_by(Complaint.created_at.desc())
    return db.scalars(stmt).all()

def get_my_complaints(db:Session,user_id:UUID):
    stmt = select(Complaint).where(
        Complaint.user_id == user_id
    ).order_by(Complaint.id.desc())
    return db.scalars(stmt).all()

def get_anonymous_complaints(db:Session):
    stmt = (select(Complaint).where(
        Complaint.is_anonymous == True
    ).order_by(Complaint.id.desc()))
    return db.scalars(stmt).all()

def get_complaint_by_id(db:Session,complaint_id:UUID):
    stmt = select(Complaint).where(Complaint.id == complaint_id)
    return db.scalar(stmt)

def update_complaint(db:Session,complaint_id:UUID,data:ComplaintUpdate):
    stmt  = select(Complaint).where(Complaint.id == complaint_id)
    complaint = db.scalar(stmt)

    if not complaint:
        return None
    if data.status:
        complaint.status = data.status
    if data.resolution_note:
        complaint.resolution_note = data.resolution_note

    db.commit()
    db.refresh(complaint)
    return complaint

