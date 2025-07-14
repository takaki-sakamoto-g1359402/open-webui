import argparse
import datetime as dt
from pathlib import Path
from typing import Dict, List

import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
import openai
import pandas as pd


class AIAI:
    """Minimal toolkit for innovation partnership planning."""

    def __init__(self, data_path: str = "innovators.json") -> None:
        self.df = pd.read_json(data_path)
        self.graph = self._build_graph()
        self.embeds = self._embed_all()

    def _build_graph(self) -> nx.MultiDiGraph:
        g = nx.MultiDiGraph()
        for _, row in self.df.iterrows():
            g.add_node(row["name"], **row.to_dict())
        for i, a in self.df.iterrows():
            for j, b in self.df.iterrows():
                if i == j:
                    continue
                dom_a = set(a["domain"])
                dom_b = set(b["domain"])
                if dom_a & dom_b:
                    g.add_edge(a["name"], b["name"], type="synergy")
                    if a["region"] == b["region"]:
                        g.add_edge(a["name"], b["name"], type="conflict")
                if any(f.lower() in " ".join(b["flagship"]).lower() for f in a["flagship"]):
                    g.add_edge(a["name"], b["name"], type="supply-chain")
        return g

    def _embed_all(self) -> Dict[str, np.ndarray]:
        texts = [" ".join(d + f) for d, f in zip(self.df["domain"], self.df["flagship"])]
        res = openai.Embedding.create(input=texts, model="text-embedding-ada-002")
        return {
            row["name"]: np.array(e["embedding"], dtype=float)
            for row, e in zip(self.df.to_dict("records"), res["data"])
        }

    def _embed_query(self, text: str) -> np.ndarray:
        res = openai.Embedding.create(input=[text], model="text-embedding-ada-002")
        return np.array(res["data"][0]["embedding"], dtype=float)

    def find_matches(self, query: str, top_k: int = 5) -> List[str]:
        q = self._embed_query(query)
        sims = {
            name: float(np.dot(q, v) / (np.linalg.norm(q) * np.linalg.norm(v)))
            for name, v in self.embeds.items()
        }
        return [n for n, _ in sorted(sims.items(), key=lambda x: x[1], reverse=True)[:top_k]]

    def suggest_partnership(self, a: str, b: str) -> str:
        na, nb = self.df.set_index("name").loc[[a, b]]
        opp = set(na["domain"]) & set(nb["domain"])
        risk = [e for _, _, e in self.graph.edges(a, data="type") if e == "conflict" and _ == b]
        lines = [
            f"## Opportunities\n- {'; '.join(opp) if opp else 'Cross-domain exploration'}",
            f"## Risks\n- {'Competition' if risk else 'Low'}",
            "## Milestones",
            "- 6 months: Initial joint R&D and planning",
            "- 12 months: Prototype or pilot launch",
            "- 24 months: Mature integration and commercialization",
        ]
        return "\n".join(lines)

    def make_roadmap(self, query_file: str) -> str:
        text = Path(query_file).read_text().strip()
        parts = text.split("between")[-1].split("and")
        names = [p.strip() for p in parts if p.strip()]
        if len(names) < 2:
            names = self.find_matches(text, 2)
        road = self.suggest_partnership(names[0], names[1])
        out = Path(f"roadmap_{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}.md")
        out.write_text(f"# Roadmap: {names[0]} & {names[1]}\n\n" + road)
        return str(out)

    def export_graph(self, path: str) -> None:
        plt.figure(figsize=(8, 6))
        pos = nx.spring_layout(self.graph)
        nx.draw_networkx(self.graph, pos, with_labels=True, node_size=500)
        types = nx.get_edge_attributes(self.graph, "type")
        nx.draw_networkx_edge_labels(self.graph, pos, edge_labels=types)
        plt.savefig(path)
        plt.close()


def cli() -> None:
    p = argparse.ArgumentParser(description="Artificial Innovator AI")
    p.add_argument("ask_file", help="path to query text file")
    p.add_argument("--data", default="innovators.json", help="path to innovators.json")
    p.add_argument("--viz", action="store_true", help="export synergy graph to PNG")
    args = p.parse_args()
    aiai = AIAI(args.data)
    out = aiai.make_roadmap(args.ask_file)
    print(out)
    if args.viz:
        aiai.export_graph(Path(out).with_suffix(".png"))


if __name__ == "__main__":
    cli()

