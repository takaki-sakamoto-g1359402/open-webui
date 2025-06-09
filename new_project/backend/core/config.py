"""設定とユーティリティ."""
from functools import lru_cache
from pathlib import Path
from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Prototype Backend"
    jwt_secret: str = "secret"
    kyc_secret: str = "kycsecret"
    database_url: str = "sqlite:///./app.db"

    class Config:
        env_file = Path(__file__).resolve().parents[2] / '.env'
        env_prefix = ''

@lru_cache
def get_settings() -> Settings:
    return Settings()
