import json
import sys
from pathlib import Path
from typing import List, Dict
from datetime import datetime

import numpy as np
import pandas as pd
import networkx as nx

try:
    import openai
except Exception:  # pragma: no cover - optional openai import
    openai = None

try:
    import matplotlib.pyplot as plt
except Exception:  # pragma: no cover - optional matplotlib
    plt = None

EMBED_DIM = 1536


def embed(text: str) -> np.ndarray:
    """Return embedding using OpenAI or a deterministic fallback."""
    if openai is not None:
        try:
            resp = openai.Embedding.create(input=[text], model="text-embedding-ada-002")
            return np.array(resp["data"][0]["embedding"], dtype=float)
        except Exception:
            pass
    rng = np.random.default_rng(abs(hash(text)) % (2**32))
    return rng.random(EMBED_DIM)


def load_data(fp: Path) -> pd.DataFrame:
    """Load innovators.json and attach embeddings."""
    df = pd.read_json(fp)
    df["text"] = df.apply(lambda r: " ".join(r.get("domain", [])) + " " + " ".join(r.get("flagship", [])), axis=1)
    df["embed"] = df["text"].apply(embed)
    return df


def build_graph(df: pd.DataFrame) -> nx.MultiDiGraph:
    """Construct synergy graph based on domain overlap."""
    G = nx.MultiDiGraph()
    for _, row in df.iterrows():
        G.add_node(row["name"], **row.to_dict())
    for i, a in df.iterrows():
        for j, b in df.iterrows():
            if i >= j:
                continue
            a_dom, b_dom = set(a.get("domain", [])), set(b.get("domain", []))
            overlap = len(a_dom & b_dom) / max(1, len(a_dom | b_dom))
            if overlap > 0.3:
                G.add_edge(a["name"], b["name"], type="synergy", weight=overlap)
                G.add_edge(b["name"], a["name"], type="synergy", weight=overlap)
    return G


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    if not np.any(a) or not np.any(b):
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def find_matches(df: pd.DataFrame, query: str, top_k: int = 5) -> pd.DataFrame:
    """Return top_k innovators close to query embedding."""
    q_vec = embed(query)
    df["score"] = df["embed"].apply(lambda v: cosine(q_vec, v))
    return df.sort_values("score", ascending=False).head(top_k)


def suggest_partnership(a: Dict, b: Dict) -> Dict[str, List[str]]:
    """Generate naive partnership suggestions."""
    a_dom = set(a.get("domain", []))
    b_dom = set(b.get("domain", []))
    shared = a_dom & b_dom
    opp = [f"Leverage {a['flagship'][0]} with {b['flagship'][0]} in {d}" for d in shared] or ["Explore cross-domain innovation"]
    risk = ["Competition in overlapping areas" if shared else "Cultural alignment"]
    milestones = {
        "6m": f"Initial alignment between {a['name']} and {b['name']}.",
        "12m": f"Prototype integrating {a['flagship'][0]} and {b['flagship'][0]}.",
        "24m": f"Scaled deployment across organizations."
    }
    return {"opportunities": opp, "risks": risk, "milestones": milestones}


def parse_names(df: pd.DataFrame, text: str) -> List[str]:
    names = []
    lower = text.lower()
    for name in df["name"]:
        if name.lower() in lower:
            names.append(name)
    return names


def make_roadmap(df: pd.DataFrame, query: str) -> Path:
    """Create roadmap markdown file for query."""
    names = parse_names(df, query)
    if len(names) >= 2:
        a_name, b_name = names[:2]
    elif names:
        a_name = names[0]
        b_name = find_matches(df, query, 2).iloc[1]["name"]
    else:
        best = find_matches(df, query, 2)
        a_name, b_name = best.iloc[0]["name"], best.iloc[1]["name"]
    a = df[df["name"] == a_name].iloc[0].to_dict()
    b = df[df["name"] == b_name].iloc[0].to_dict()
    suggestion = suggest_partnership(a, b)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = Path(f"roadmap_{ts}.md")
    with open(path, "w") as f:
        f.write(f"# Roadmap: {a_name} & {b_name}\n\n")
        f.write("## Shared Opportunities\n")
        for o in suggestion["opportunities"]:
            f.write(f"- {o}\n")
        f.write("\n## Risk Factors\n")
        for r in suggestion["risks"]:
            f.write(f"- {r}\n")
        f.write("\n## Milestones\n")
        for k in ["6m", "12m", "24m"]:
            f.write(f"- **{k}**: {suggestion['milestones'][k]}\n")
    return path


def visualize_graph(G: nx.MultiDiGraph, path: Path) -> None:
    if plt is None:
        return
    pos = nx.spring_layout(G)
    edge_colors = ["green" if d["type"] == "synergy" else "black" for _, _, d in G.edges(data=True)]
    nx.draw(G, pos, with_labels=True, edge_color=edge_colors, node_color="#ccccff")
    plt.savefig(path)


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Artificial Innovator AI")
    parser.add_argument("ask_file", type=Path, help="Path to ask.txt")
    parser.add_argument("--innovators", type=Path, default=Path("innovators.json"))
    parser.add_argument("--viz", action="store_true", help="Export synergy graph")
    args = parser.parse_args()

    df = load_data(args.innovators)
    query = Path(args.ask_file).read_text()
    roadmap_path = make_roadmap(df, query)
    print(roadmap_path)

    if args.viz:
        G = build_graph(df)
        viz_path = Path(f"synergy_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
        visualize_graph(G, viz_path)
        print(viz_path)


if __name__ == "__main__":
    main()
