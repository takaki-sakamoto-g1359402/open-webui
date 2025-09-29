import os
import threading
import time
import random
from typing import Iterable, List

import numpy as np

from .agent import InnovatorAgent
from .reflection import init_db, store_policy, best_policy


class SwarmBus:
    """Simple in-memory pub/sub bus mimicking ROS 2 topics."""

    def __init__(self) -> None:
        self.subs = {}

    def publish(self, topic: str, msg) -> None:
        for cb in list(self.subs.get(topic, [])):
            cb(msg)

    def subscribe(self, topic: str, cb) -> None:
        self.subs.setdefault(topic, []).append(cb)


bus = SwarmBus()


class SwarmRobot(threading.Thread):
    """Robot wrapper that shares policy via the bus."""

    def __init__(self, name: str, bus: SwarmBus) -> None:
        super().__init__(daemon=True)
        self.name = name
        self.bus = bus
        self.agent = InnovatorAgent()
        self.params = np.random.rand(4).tolist()
        self._policy_synced = False
        self.reward = 0.0
        self.last_hb = time.time()
        bus.subscribe("policy", self.update_policy)

    def update_policy(self, params: Iterable[float]) -> None:
        vec = np.array(list(params), dtype=float)
        if not self._policy_synced:
            # Adopt the first shared policy verbatim so all robots start from
            # the same baseline before blending subsequent updates.
            self.params = vec.tolist()
            self._policy_synced = True
            return

        current = np.array(self.params, dtype=float)
        self.params = ((current + vec) / 2).tolist()

    def run_episode(self) -> None:
        color, target = "red", "left"
        success = self.agent.execute(color, target)
        self.reward = 1.0 if success else 0.0
        store_policy(self.name, self.reward, self.params)
        top = best_policy()
        if top:
            self.bus.publish("policy", top)

    def heartbeat(self) -> None:
        self.last_hb = time.time()
        self.bus.publish("safety_state", (self.name, self.last_hb))

    def run(self) -> None:
        while True:
            self.heartbeat()
            self.run_episode()
            time.sleep(2)


def launch_swarm(count: int = 5) -> None:
    init_db()
    robots = [SwarmRobot(f"robot{i+1}", bus) for i in range(count)]
    for r in robots:
        r.start()

    def monitor() -> None:
        last = {r.name: time.time() for r in robots}

        def update(msg) -> None:
            name, ts = msg
            last[name] = ts

        bus.subscribe("safety_state", update)
        while True:
            now = time.time()
            for n, t in last.items():
                if now - t > 6:
                    print("SAFE_SHUTDOWN")
                    os._exit(0)
            time.sleep(2)

    threading.Thread(target=monitor, daemon=True).start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
