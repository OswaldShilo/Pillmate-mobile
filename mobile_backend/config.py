"""Configuration from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_NAME: str = "PillMate API"
    APP_VERSION: str = "1.0.0"

    # SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pillmate.db")

    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-please-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

settings = Settings()

