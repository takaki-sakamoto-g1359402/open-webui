import json
from pathlib import Path
from typing import List

import faiss  # type: ignore
import numpy as np


class Memory:
    """Simple FAISS backed memory with a JSONL log."""

    def __init__(self, dim: int, log_path: str | Path):
        self.dim = dim
        self.log_path = Path(log_path)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.log_path.exists():
            self.log_path.touch()
        self.index = faiss.IndexFlatL2(dim)
        self.texts: List[str] = []

    def _embed(self, text: str) -> np.ndarray:
        """Placeholder embedding function."""
        rng = np.random.default_rng(abs(hash(text)) % (2**32))
        return rng.random(self.dim, dtype=np.float32)

    def add(self, text: str) -> None:
        vec = self._embed(text)
        self.index.add(vec.reshape(1, -1))
        self.texts.append(text)
        with open(self.log_path, "a", encoding="utf-8") as f:
            json.dump({"text": text}, f)
            f.write("\n")

    def search(self, query: str, k: int = 5) -> List[str]:
        if self.index.ntotal == 0:
            return []
        vec = self._embed(query)
        distances, indices = self.index.search(vec.reshape(1, -1), k)
        results = []
        for i in indices[0]:
            if 0 <= i < len(self.texts):
                results.append(self.texts[i])
        return results
