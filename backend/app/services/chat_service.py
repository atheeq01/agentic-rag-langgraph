from sqlalchemy import select
from sqlalchemy.orm import Session
from uuid import UUID
from app.models.chat import ChatSession, ChatMessage, MessageFeedback
from app.schemas.chat import ChatMessageCreate, FeedbackCreate


def create_session(db: Session,user_id: UUID):
    session = ChatSession(user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def add_message(db: Session, message_in:ChatMessageCreate):
    message = ChatMessage(
        session_id = message_in.session_id,
        role = message_in.role,
        content = message_in.content,
        meta_data = message_in.meta_data,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

def get_session(db: Session, user_id: UUID):
    stmt = select(ChatSession).where(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc())
    return db.scalars(stmt).all()

def get_session_messages(db: Session, session_id: UUID):
    stmt = select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
    return db.scalars(stmt).all()

def add_feedback(db: Session, message_id:UUID ,feedback: FeedbackCreate):
    feedback = MessageFeedback(
        message_id = message_id,
        rating = feedback.rating,
        reason = feedback.reason,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback

