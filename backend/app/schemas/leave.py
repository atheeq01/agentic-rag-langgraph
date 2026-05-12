from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime,date
from uuid import UUID
from datetime import date

class LeaveBase(BaseModel):
    start_date: date
    end_date: date
    leave_type: str
    reason: str | None = None

    @field_validator("start_date")
    def validate_not_past(cls, v):
        if v < date.today():
            raise ValueError("Start date cannot be in the past.")
        return v

    @field_validator("end_date")
    def validate_dates(cls, v, info):
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("End date must be on or after start date.")
        return v

class LeaveCreate(LeaveBase):
    pass

class LeaveOut(LeaveBase):
    id: UUID
    user_id: UUID
    status: str
    approved_by: UUID | None = None
    approved_at: datetime | None = None
    created_at: datetime


    model_config = ConfigDict(from_attributes=True)