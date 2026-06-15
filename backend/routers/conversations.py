from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from database import get_db
from models.user import User
from models.conversation import Conversation
from models.message import Message
from core.dependencies import get_current_user

router = APIRouter(prefix="/conversations", tags=["Conversations"])

# Schemas
class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    role: str
    content: str

class ConversationCreate(BaseModel):
    title: str = "New Chat"

@router.get("/", response_model=List[ConversationOut])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    convs = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.updated_at.desc()).all()
    return convs

@router.post("/", response_model=ConversationOut)
def create_conversation(
    conv_data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_conv = Conversation(user_id=current_user.id, title=conv_data.title)
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    return new_conv

@router.delete("/{conv_id}")
def delete_conversation(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")
    db.delete(conv)
    db.commit()
    return {"ok": True}

@router.get("/{conv_id}/messages", response_model=List[MessageOut])
def get_messages(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")
    messages = db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.created_at).all()
    return messages

@router.post("/{conv_id}/messages", response_model=MessageOut)
def create_message(
    conv_id: int,
    msg: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")
    new_msg = Message(conversation_id=conv_id, role=msg.role, content=msg.content)
    db.add(new_msg)
    # Update conversation's updated_at
    conv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(new_msg)
    return new_msg