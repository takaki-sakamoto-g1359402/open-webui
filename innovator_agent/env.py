import pybullet as p
import pybullet_data
import numpy as np
from dataclasses import dataclass
from typing import Tuple


def load_world() -> Tuple[int, dict]:
    """Initializes simulation world with a robot and colored blocks."""
    physics_client = p.connect(p.DIRECT)
    p.resetSimulation()
    p.setGravity(0, 0, -9.81)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())
    plane = p.loadURDF("plane.urdf")
    table = p.loadURDF("table/table.urdf", [0.5, 0, -0.65], globalScaling=1.0)
    robot = p.loadURDF("franka_panda/panda.urdf", useFixedBase=True)

    colors = {
        "red": [1, 0, 0, 1],
        "green": [0, 1, 0, 1],
        "blue": [0, 0, 1, 1],
    }
    blocks = {}
    x_base = 0.4
    for i, (name, rgba) in enumerate(colors.items()):
        block = p.loadURDF(
            "cube_small.urdf",
            [x_base, (i - 1) * 0.1, 0.02],
            globalScaling=1.0,
        )
        p.changeVisualShape(block, -1, rgbaColor=rgba)
        blocks[name] = block
    return robot, blocks


def disconnect():
    p.disconnect()


@dataclass
class Camera:
    width: int = 224
    height: int = 224
    fov: int = 60
    near: float = 0.1
    far: float = 3.1

    def capture(self) -> np.ndarray:
        view = p.computeViewMatrixFromYawPitchRoll(
            cameraTargetPosition=[0.5, 0, 0.1],
            distance=1.0,
            yaw=45,
            pitch=-35,
            roll=0,
            upAxisIndex=2,
        )
        proj = p.computeProjectionMatrixFOV(
            fov=self.fov,
            aspect=1.0,
            nearVal=self.near,
            farVal=self.far,
        )
        _, _, px, _, _ = p.getCameraImage(
            self.width, self.height, view, proj, renderer=p.ER_BULLET_HARDWARE_OPENGL
        )
        rgb = np.reshape(px, (self.height, self.width, 4))[:, :, :3]
        return rgb.astype(np.uint8)
