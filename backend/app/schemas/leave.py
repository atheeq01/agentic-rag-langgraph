from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime,date
from uuid import UUID
class LeaveBase(BaseModel):
    start_date:date
    end_date:date
    leave_type:str
    reason:str| None = None

    @field_validator("end_date")
    def validate_dates(cls, v, info):
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
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