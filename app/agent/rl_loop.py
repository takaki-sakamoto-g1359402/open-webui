from __future__ import annotations

from typing import Any
import random

try:
    from gymnasium import Env
except Exception:  # pragma: no cover - optional dependency
    Env = Any  # type: ignore


class DummyVecEnv:
    """Minimal stand-in for gymnasium.vector environments."""

    def __init__(self, env_fns):
        self.envs = [fn() for fn in env_fns]

    def reset(self):
        return [env.reset() for env in self.envs]

    def step(self, actions):
        results = [env.step(a) for env, a in zip(self.envs, actions)]
        obs, rewards, dones, infos = zip(*results)
        return list(obs), list(rewards), list(dones), list(infos)


class AgentPPO:
    """Very small PPO style loop stub."""

    def __init__(self, env: Env):
        self.env = DummyVecEnv([lambda: env])
        self.policy = None  # Placeholder for a learned policy network

    def act(self, observation: Any) -> Any:
        """Return an action for the given observation."""
        env = self.env.envs[0]
        if hasattr(env, "action_space"):
            return env.action_space.sample()
        return random.random()

    def learn(self, total_timesteps: int) -> None:
        """Run a very small training loop."""
        obs = self.env.reset()
        for _ in range(total_timesteps):
            action = self.act(obs)
            obs, reward, done, info = self.env.step([action])
            if any(done):
                obs = self.env.reset()
