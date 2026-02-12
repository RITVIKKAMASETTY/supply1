"""
Centralised configuration — loads all secrets from .env once.

Usage:
    from config import settings
    settings.GROQ_API_KEY
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Auth
    SECRET_KEY: str = os.getenv("secret_key", "changeme")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Twilio
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    TO_PHONE_NUMBER: str = os.getenv("TO_PHONE_NUMBER", "")

    # LLM & Search
    GROQ_API_KEY: str = os.getenv("GROQ", "")
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "") or os.getenv("TAVILY", "")


settings = Settings()
