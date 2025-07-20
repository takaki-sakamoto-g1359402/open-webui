from innovator_agent.swarm import SwarmBus, SwarmRobot
from innovator_agent.reflection import init_db
import os


def test_policy_update(tmp_path):
    os.chdir(tmp_path)
    init_db()
    bus = SwarmBus()
    r1 = SwarmRobot("r1", bus)
    r2 = SwarmRobot("r2", bus)
    r1.update_policy([1, 1, 1, 1])
    bus.publish("policy", [2, 2, 2, 2])
    assert r1.params == [1.5, 1.5, 1.5, 1.5]

