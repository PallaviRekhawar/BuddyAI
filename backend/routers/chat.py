from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from core.dependencies import get_current_user
from database import get_db
from models.conversation import Conversation
from models.message import Message
from models.user import User

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: int


class ChatResponse(BaseModel):
    reply: str


async def get_reply_from_provider(prompt: str) -> str:
    provider = settings.AI_PROVIDER.lower()

    if provider == "auto":
        if settings.GROQ_API_KEY:
            provider = "groq"
        elif settings.OPENAI_API_KEY:
            provider = "openai"
        else:
            provider = "ollama"

    if provider == "groq" and settings.GROQ_API_KEY:
        url = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
        }
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
    elif provider == "openai" and settings.OPENAI_API_KEY:
        base_url = (settings.OPENAI_BASE_URL or "https://api.openai.com/v1").rstrip("/")
        url = f"{base_url}/chat/completions"
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
        }
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
    else:
        url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
        }
        headers = {"Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    if provider in {"groq", "openai"}:
        choices = data.get("choices", [])
        if not choices:
            raise ValueError("No response choices returned from provider")
        reply = choices[0].get("message", {}).get("content", "")
    else:
        reply = data.get("response", "")

    reply = reply.strip()
    if not reply:
        raise ValueError("The provider returned an empty response")
    return reply


@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == request.conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    user_msg = Message(conversation_id=conv.id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()

    try:
        reply = await get_reply_from_provider(request.message)
    except Exception as e:
        reply = f"Error: {str(e)}"

    assistant_msg = Message(conversation_id=conv.id, role="assistant", content=reply)
    db.add(assistant_msg)
    conv.updated_at = datetime.utcnow()
    db.commit()

    return ChatResponse(reply=reply)