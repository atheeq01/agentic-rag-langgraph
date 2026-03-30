import uuid
from sqlalchemy import Column, Boolean, String, DateTime ,func
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class User(Base):
    __tablename__ = "user"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), nullable=False, default="employee")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())