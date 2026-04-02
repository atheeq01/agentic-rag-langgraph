from fastapi import APIRouter,Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from uuid import UUID

from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.schemas.chat import ChatMessageCreate, ChatMessageOut, ChatSessionOut, FeedbackCreate
from app.services import chat_service
from app.models.chat import ChatSession
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["AI Chat"])

@router.post("/sessions", response_model=ChatMessageOut)
def create_chat_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return chat_service.create_chat_session(db, current_user.id)

@router.get("/sessions", response_model=list[ChatSessionOut])
def list_sessions(db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return chat_service.get_sessions(db, current_user.id)

@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
def get_messages(session_id: UUID, db:Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(ChatSession).where(ChatSession.id == session_id,ChatSession.user_id == current_user.id)
    session = db.scalar(stmt)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return chat_service.get_messages(session, current_user.id)

@router.post("/messages", response_model=ChatMessageOut)
def send_message(message_in: ChatMessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(ChatSession).where(ChatSession.id == message_in.session_id, ChatSession.user_id == current_user.id)
    if not db.scalar(stmt):
        raise HTTPException(status_code=404, detail="Session not found")
    return chat_service.add_message(db, message_in)

@router.post("/messages/{message_id}/feedback")
def message_feedback(message_id:UUID,feedback_in:FeedbackCreate,db:Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return chat_service.add_feedback(db, message_id, feedback_in)

