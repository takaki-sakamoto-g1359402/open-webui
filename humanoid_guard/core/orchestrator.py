"""Task assignment and replanning logic."""
import asyncio
from collections import deque
from typing import Dict
import paho.mqtt.client as mqtt

from .schemas import Heartbeat, Task
from ..config import settings

class Orchestrator:
    def __init__(self) -> None:
        self.pending_tasks: deque[Task] = deque()
        self.robots: Dict[str, Heartbeat] = {}
        self._rr_index = 0
        self.client = mqtt.Client()
        if settings.mqtt_user:
            self.client.username_pw_set(settings.mqtt_user, settings.mqtt_password)
        self.client.connect(settings.mqtt_broker, settings.mqtt_port)
        self.client.loop_start()

    async def add_task(self, task: Task) -> None:
        self.pending_tasks.append(task)

    async def update_robot(self, hb: Heartbeat) -> None:
        self.robots[hb.id] = hb

    async def assign_task(self) -> None:
        if not self.pending_tasks or not self.robots:
            return
        robot_ids = list(self.robots.keys())
        robot_id = robot_ids[self._rr_index % len(robot_ids)]
        task = self.pending_tasks.popleft()
        cmd_topic = f"cmd/{robot_id}"
        self.client.publish(cmd_topic, task.command)
        self._rr_index += 1

    async def replanner(self) -> None:
        while True:
            await asyncio.sleep(5)
            for robot_id, hb in list(self.robots.items()):
                if hb.battery < 15:
                    self.client.publish(f"cmd/{robot_id}", "RECHARGE")

    async def shutdown(self) -> None:
        self.client.loop_stop()
        self.client.disconnect()

