"""
Application settings loaded from environment variables / .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/sports_intelligence"

    # External APIs
    FOOTBALL_DATA_API_KEY: str = ""

    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me"
    DEBUG: bool = True

    # Cache TTL (seconds)
    FIXTURES_CACHE_TTL: int = 1800
    LEAGUE_TABLE_CACHE_TTL: int = 3600


settings = Settings()
