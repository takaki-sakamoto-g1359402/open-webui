"""Artificial Innovator AI Plus CLI"""
import argparse
import datetime as dt
from pathlib import Path
from typing import Dict, List, Tuple
import openai
import pandas as pd
import numpy as np
import networkx as nx
from AIAI_P import database, causal, gui_utils


class AIAIPlus:
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
        res = openai.Embedding.create(model="text-embedding-ada-002", input=texts)
        return {
            row["name"]: np.array(e["embedding"], dtype=float)
            for row, e in zip(self.df.to_dict("records"), res["data"])
        }

    def _embed_query(self, text: str) -> np.ndarray:
        res = openai.Embedding.create(model="text-embedding-ada-002", input=[text])
        return np.array(res["data"][0]["embedding"], dtype=float)

    def _memory_weight(self, name: str) -> float:
        suc, fail = database.get_stats(name)
        return 1 + 0.1 * suc - 0.1 * fail

    def find_matches(self, query: str, top_k: int = 5) -> List[str]:
        qv = self._embed_query(query)
        sims = {}
        for name, emb in self.embeds.items():
            sim = float(np.dot(qv, emb) / (np.linalg.norm(qv) * np.linalg.norm(emb)))
            sims[name] = sim * self._memory_weight(name)
        return [n for n, _ in sorted(sims.items(), key=lambda x: x[1], reverse=True)[:top_k]]

    def translate_query(self, text: str) -> Tuple[str, str]:
        resp = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Detect language and translate to English."},
                {"role": "user", "content": text},
            ],
            temperature=0,
        )
        content = resp["choices"][0]["message"]["content"]
        # Expect format: "<lang>\n<translation>"
        parts = content.split("\n", 1)
        if len(parts) == 2:
            lang, eng = parts
        else:
            lang, eng = "English", text
        return lang.strip(), eng.strip()

    def suggest_partnership(self, a: str, b: str, eng_query: str, lang: str, original: str, feedback: str | None) -> str:
        na = self.df.set_index("name").loc[a].to_dict()
        nb = self.df.set_index("name").loc[b].to_dict()
        impact = causal.estimate_impact(na, nb, self.graph)
        sa, fa = database.get_stats(a)
        sb, fb = database.get_stats(b)
        lines = [
            f"# Roadmap: {a} & {b}",
            f"*Query language*: {lang}",
            f"*Original query*: {original}",
            f"*English translation*: {eng_query}",
            f"*Causal impact score*: {impact}",
            f"*Memory*: {a} success={sa} fail={fa}; {b} success={sb} fail={fb}",
            "",
            "## Opportunities",
            f"- {'; '.join(set(na['domain']) & set(nb['domain'])) or 'Cross-domain exploration'}",
            "## Risks",
            f"- {'Competition' if self.graph.has_edge(a, b, key=None, type='conflict') else 'Low'}",
            "## Milestones",
            "- 6 months: Initial joint R&D and planning",
            "- 12 months: Prototype or pilot launch",
            "- 24 months: Mature integration and commercialization",
        ]
        if feedback:
            database.log_history(a, b, feedback)
        return "\n".join(lines)

    def make_roadmap(self, query_file: str, feedback: str | None = None) -> str:
        text = Path(query_file).read_text().strip()
        lang, eng = self.translate_query(text)
        parts = eng.split("between")[-1].split("and")
        names = [p.strip() for p in parts if p.strip()]
        if len(names) < 2:
            names = self.find_matches(eng, 2)
        road = self.suggest_partnership(names[0], names[1], eng, lang, text, feedback)
        out = Path(f"roadmap_{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}.md")
        out.write_text(road)
        return str(out)

    def export_graph(self, path: Path, edge_types: List[str]) -> None:
        g = gui_utils.filtered_graph(self.graph, edge_types)
        gui_utils.save_graph_png(g, path)


def cli() -> None:
    p = argparse.ArgumentParser(description="Artificial Innovator AI Plus")
    p.add_argument("ask_file")
    p.add_argument("--feedback", choices=["success", "fail"])
    p.add_argument("--data", default="innovators.json")
    p.add_argument("--viz", action="store_true")
    args = p.parse_args()
    app = AIAIPlus(args.data)
    out = app.make_roadmap(args.ask_file, args.feedback)
    print(out)
    if args.viz:
        app.export_graph(Path(out).with_suffix(".png"), ["synergy", "conflict", "supply-chain"])


if __name__ == "__main__":
    cli()
