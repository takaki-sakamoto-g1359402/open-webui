import numpy as np
import pybullet as p
from .env import load_world, disconnect, Camera
from .motor import move_ee, set_gripper
from .planner import parse_command
from .reflection import Episode, store_episode, latest_suggestion, init_db

LEFT_POS = np.array([0.3, 0.2, 0.05])
RIGHT_POS = np.array([0.3, -0.2, 0.05])


class InnovatorAgent:
    def __init__(self):
        init_db()
        self.robot, self.blocks = load_world()
        self.camera = Camera()

    def plan(self, text: str):
        return parse_command(text)

    def execute(self, color: str, target: str) -> bool:
        target_pos = LEFT_POS if target == "left" else RIGHT_POS
        block = self.blocks[color]
        pos, _ = p.getBasePositionAndOrientation(block)

        # Approach block
        approach = np.array(pos) + [0, 0, 0.1]
        move_ee(self.robot, approach)
        move_ee(self.robot, np.array(pos) + [0, 0, 0.02])
        set_gripper(self.robot, True)

        # Lift
        move_ee(self.robot, approach)
        # Move to target
        drop = target_pos + [0, 0, 0.02]
        move_ee(self.robot, drop + [0, 0, 0.1])
        move_ee(self.robot, drop)
        set_gripper(self.robot, False)
        move_ee(self.robot, drop + [0, 0, 0.1])
        success = True
        return success

    def observe(self):
        return self.camera.capture()

    def run(self, user_text: str) -> bool:
        color, target = self.plan(user_text)
        obs = self.observe()
        success = self.execute(color, target)
        store_episode(Episode("obs", f"{color}->{target}", success))
        print(latest_suggestion())
        return success

    def shutdown(self):
        disconnect()
