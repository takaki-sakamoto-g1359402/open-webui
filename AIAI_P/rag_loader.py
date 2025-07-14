"""Vector DB loader for RAG context."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import List

import openai
import os
import redis

try:
    import weaviate
    HAS_WEAVIATE = True
except Exception:  # pragma: no cover
    HAS_WEAVIATE = False

try:
    import faiss
    HAS_FAISS = True
except Exception:  # pragma: no cover
    HAS_FAISS = False

openai.api_key = os.getenv("OPENAI_API_KEY")

DATA_DIR = Path("data")
VEC_PATH = DATA_DIR / "vectors.json"

_cache: dict[str, List[float]] = {}
_redis = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))


def _embed(texts: List[str]) -> List[List[float]]:
    ids = []
    to_embed = []
    for t in texts:
        h = hashlib.sha256(t.encode()).hexdigest()
        ids.append(h)
        if h not in _cache:
            if _redis.exists(h):
                _cache[h] = json.loads(_redis.get(h))
            else:
                to_embed.append((h, t))
    if to_embed:
        payload = [t for _, t in to_embed]
        res = openai.Embedding.create(input=payload, model="text-embedding-ada-002")
        for (h, _), vec in zip(to_embed, res.data):
            _cache[h] = vec["embedding"]
            _redis.set(h, json.dumps(vec["embedding"]))
    return [_cache[h] for h in ids]


class VectorDB:
    def __init__(self) -> None:
        self.use_weaviate = HAS_WEAVIATE
        if self.use_weaviate:
            self.client = weaviate.Client("http://localhost:8080")
        elif HAS_FAISS:
            self.index = faiss.IndexFlatL2(1536)
            self.docs: List[str] = []

    def add_texts(self, texts: List[str]) -> None:
        vecs = _embed(texts)
        if self.use_weaviate:
            for txt, vec in zip(texts, vecs):
                self.client.data_object.create({"text": txt}, "Doc", vector=vec)
        elif HAS_FAISS:
            import numpy as np
            self.index.add(np.array(vecs, dtype="float32"))
            self.docs.extend(texts)
        VEC_PATH.write_text(json.dumps(list(_cache.items())))

    def search(self, query: str, top_n: int = 3) -> List[str]:
        vec = _embed([query])[0]
        if self.use_weaviate:
            resp = (
                self.client.query.get("Doc", ["text"]).with_near_vector({"vector": vec}).with_limit(top_n).do()
            )
            return [d["text"] for d in resp["data"]["Get"]["Doc"]]
        elif HAS_FAISS:
            import numpy as np
            distances, indices = self.index.search(np.array([vec], dtype="float32"), top_n)
            return [self.docs[i] for i in indices[0] if i < len(self.docs)]
        return []


def retrieve_context(query: str, top_n: int = 3) -> str:
    db = VectorDB()
    results = db.search(query, top_n)
    return "\n".join(results)

