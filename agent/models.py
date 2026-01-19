"""Self and user model persistence and updates."""
from __future__ import annotations

import json
from dataclasses import dataclass

from agent.db import fetch_one
from agent.llm import LLMClient


@dataclass
class ModelUpdateResult:
    self_model: dict
    user_model: dict
    notes: str


class ModelStore:
    """Load and update the self and user models."""

    def __init__(self, conn, llm: LLMClient):
        self.conn = conn
        self.llm = llm

    def load(self, name: str) -> dict:
        row = fetch_one(self.conn, "SELECT blob FROM models WHERE name = ?", (name,))
        if row is None:
            return {}
        return json.loads(row["blob"])

    def save(self, name: str, blob: dict) -> None:
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO models (name, blob) VALUES (?, ?)",
            (name, json.dumps(blob)),
        )
        self.conn.commit()

    def update_after_episode(
        self,
        *,
        success: bool,
        task: str,
        reflection: str,
    ) -> ModelUpdateResult:
        self_model = self.load("self_model")
        user_model = self.load("user_model")

        reliability = self_model.get("reliability", 0.5)
        self_model["reliability"] = min(1.0, max(0.0, reliability + (0.05 if success else -0.05)))

        if not success:
            self_model.setdefault("failure_modes", []).append("recent task failure")
        if "preferred_strategies" in self_model and success:
            self_model["preferred_strategies"].append("reuse successful traces")

        if task and "long_term_goals" in user_model and task not in user_model["long_term_goals"]:
            user_model["long_term_goals"].append(task)

        critique = self.llm.generate(
            f"Critique the following reflection in one sentence: {reflection}"
        )
        notes = f"Model update critique: {critique}"

        self.save("self_model", self_model)
        self.save("user_model", user_model)

        return ModelUpdateResult(self_model=self_model, user_model=user_model, notes=notes)
