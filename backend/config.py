from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OPENAI_API_KEY: str
    ALLOWED_ORIGINS: str = "https://buddy-ai-pearl.vercel.app"

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()