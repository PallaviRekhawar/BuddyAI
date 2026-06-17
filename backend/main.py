from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, engine
from routers import auth, chat, conversations

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Chat API", version="1.0.0")

allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]

# Allow React frontend to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routes
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(conversations.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "AI Chat API is running"}
