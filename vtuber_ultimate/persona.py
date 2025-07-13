## Overview
# Persona management using MBTI, Big Five, and Hololive similarity

from dataclasses import dataclass, field
from typing import Dict
import os
import numpy as np
import pandas as pd


@dataclass
class PersonalityCore:
    """Represents an AI personality core."""

    mbti: str
    big_five: Dict[str, float]
    holo_vector: np.ndarray = field(default_factory=lambda: np.zeros(5))

    @classmethod
    def load_from_csv(cls, profile_name: str, csv_path: str) -> "PersonalityCore":
        """Load personality data from CSV."""
        if not os.path.exists(csv_path):
            raise FileNotFoundError(csv_path)
        df = pd.read_csv(csv_path)
        row = df[df["name"] == profile_name].iloc[0]
        big_five = {k: float(row[k]) for k in [
            "openness",
            "conscientiousness",
            "extraversion",
            "agreeableness",
            "neuroticism",
        ]}
        vector = row[[f"dim{i}" for i in range(1, 6)]].to_numpy(dtype=float)
        return cls(mbti=row["mbti"], big_five=big_five, holo_vector=vector)

    def similarity(self, other: "PersonalityCore") -> float:
        """Compute similarity to another personality."""
        return float(np.dot(self.holo_vector, other.holo_vector) /
                     (np.linalg.norm(self.holo_vector) * np.linalg.norm(other.holo_vector) + 1e-6))
