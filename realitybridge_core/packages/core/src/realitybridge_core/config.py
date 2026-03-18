from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="RB_", extra="ignore")

    env: str = "development"
    app_name: str = "RealityBridge Core"
    api_host: str = "0.0.0.0"
    api_port: int = 8090
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/realitybridge"
    )
    redis_url: str = "redis://localhost:6379/0"
    event_stream: str = "realitybridge.events"
    event_consumer_group: str = "realitybridge-workers"
    event_consumer_name: str = "worker-1"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    request_id_header: str = "x-request-id"
    simulation_mode: bool = True
    allow_device_execution: bool = False
    bootstrap_admin_email: str = "admin@realitybridge.local"
    bootstrap_admin_password: str = "ChangeMe123!"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
