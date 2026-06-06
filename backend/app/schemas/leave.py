from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from datetime import datetime, date
from uuid import UUID


class LeaveBase(BaseModel):
    start_date: date
    end_date: date
    leave_type: str
    reason: str | None = None

class LeaveCreate(LeaveBase):
    @field_validator("start_date")
    @classmethod
    def validate_not_past(cls, v):
        if v < date.today():
            raise ValueError("Start date cannot be in the past.")
        return v

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v, info):
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("End date must be on or after start date.")
        return v


class LeaveOut(LeaveBase):
    id: UUID
    user_id: UUID
    status: str
    approved_by: UUID | None = None
    approved_at: datetime | None = None
    created_at: datetime

    applicant_name: str | None = None
    department: str | None = None
    approver_name: str | None = None

    @model_validator(mode='before')
    @classmethod
    def map_relationships(cls, data):
        if hasattr(data, '__table__'):
            return {
                "start_date": data.start_date,
                "end_date": data.end_date,
                "leave_type": data.leave_type,
                "reason": data.reason,
                "id": data.id,
                "user_id": data.user_id,
                "status": data.status,
                "approved_by": data.approved_by,
                "approved_at": data.approved_at,
                "created_at": data.created_at,
                # Safely extract related user data
                "applicant_name": data.user.full_name if getattr(data, "user", None) else "Unknown",
                "department": getattr(data.user, "department", "General") if getattr(data, "user", None) else "General",
                "approver_name": getattr(data.approver, "full_name", None) if getattr(data, "approver", None) else None,
            }
        return data

    model_config = ConfigDict(from_attributes=True)