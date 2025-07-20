import pybullet as p
import numpy as np

ROBOT_EE_INDEX = 11  # panda gripper index
GRIPPER_OPEN = 0.04
GRIPPER_CLOSED = 0.0


def move_ee(robot: int, target_pos: np.ndarray, steps: int = 50):
    """Moves end effector to target position using IK."""
    joint_indices = list(range(7))  # arm joints
    for _ in range(steps):
        joint_pos = p.calculateInverseKinematics(robot, ROBOT_EE_INDEX, target_pos)
        p.setJointMotorControlArray(
            robot,
            joint_indices,
            p.POSITION_CONTROL,
            targetPositions=joint_pos[:7],
        )
        p.stepSimulation()


def set_gripper(robot: int, closed: bool):
    opening = GRIPPER_CLOSED if closed else GRIPPER_OPEN
    for joint in [9, 10]:
        p.setJointMotorControl2(robot, joint, p.POSITION_CONTROL, targetPosition=opening)
    for _ in range(25):
        p.stepSimulation()
