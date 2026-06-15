from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.dependencies import get_current_user
from models.user import User
from models.conversation import Conversation
from models.message import Message
from database import get_db
import httpx
from datetime import datetime   # <-- add this line

router = APIRouter(prefix="/chat", tags=["Chat"])

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:1b"

class ChatRequest(BaseModel):
    message: str
    conversation_id: int

class ChatResponse(BaseModel):
    reply: str

@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify conversation belongs to user
    conv = db.query(Conversation).filter(Conversation.id == request.conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    # Save user message
    user_msg = Message(conversation_id=conv.id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()

    # Call Ollama
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            payload = {
                "model": MODEL_NAME,
                "prompt": request.message,
                "stream": False
            }
            response = await client.post(OLLAMA_URL, json=payload)
            if response.status_code != 200:
                raise HTTPException(500, "Ollama error")
            data = response.json()
            reply = data.get("response", "").strip()
            if not reply:
                reply = "No response from model."
    except Exception as e:
        reply = f"Error: {str(e)}"

    # Save assistant message
    assistant_msg = Message(conversation_id=conv.id, role="assistant", content=reply)
    db.add(assistant_msg)
    # Update conversation's updated_at
    conv.updated_at = datetime.utcnow()
    db.commit()

    return ChatResponse(reply=reply)