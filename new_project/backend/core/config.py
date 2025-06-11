"""設定とユーティリティ."""

from pathlib import Path
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """環境設定"""

    DATABASE_URL: str = Field("sqlite:///./app.db", env="DATABASE_URL")
    JWT_SECRET: str = Field("secret", env="JWT_SECRET")
    KYC_SECRET: str = Field("kycsecret", env="KYC_SECRET")

    class Config:
        env_file = Path(__file__).resolve().parents[2] / ".env"


settings = Settings()  # type: ignore[call-arg]
