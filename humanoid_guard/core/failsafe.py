"""Failsafe utilities for critical shutdown and audit logging."""
import json
from datetime import datetime
import paho.mqtt.client as mqtt
from pythonjsonlogger import jsonlogger
import logging

from ..config import settings

logger = logging.getLogger("failsafe")
handler = logging.StreamHandler()
handler.setFormatter(jsonlogger.JsonFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

client = mqtt.Client()
if settings.mqtt_user:
    client.username_pw_set(settings.mqtt_user, settings.mqtt_password)
client.connect(settings.mqtt_broker, settings.mqtt_port)
client.loop_start()

def on_critical(robot_id: str) -> None:
    """Kill a robot and log the event."""
    client.publish(f"cmd/{robot_id}", f"KILL:{robot_id}")
    entry = {
        "robot_id": robot_id,
        "timestamp": datetime.utcnow().isoformat(),
        "action": "KILL"
    }
    logger.critical(json.dumps(entry))
