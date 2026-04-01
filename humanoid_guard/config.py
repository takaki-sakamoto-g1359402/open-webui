"""Configuration for MQTT broker via environment variables."""
from pydantic import BaseSettings

class Settings(BaseSettings):
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_user: str | None = None
    mqtt_password: str | None = None

    class Config:
        env_prefix = ""
        case_sensitive = False

settings = Settings()
