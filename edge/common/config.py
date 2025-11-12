import os
from functools import lru_cache
from pydantic import BaseSettings, AnyUrl, Field


class Settings(BaseSettings):
    app_env: str = Field(default="development", alias="APP_ENV")
    site_id: str = Field(default="alpha-site", alias="SITE_ID")
    mqtt_url: AnyUrl = Field(default="mqtt://localhost:1883", alias="MQTT_URL")

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def site_topic(suffix: str) -> str:
    settings = get_settings()
    suffix = suffix.lstrip('/')
    return f"site/{settings.site_id}/{suffix}"


def require_env(var: str) -> str:
    value = os.getenv(var)
    if not value:
        raise RuntimeError(f"Missing required env var: {var}")
    return value
