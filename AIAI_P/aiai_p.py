"""AIAI-P main CLI and core logic."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List, Tuple, Dict, Any
import os
import math
from io import BytesIO

import networkx as nx
import openai

from . import gui_utils, database, causal, rag_loader

openai.api_key = os.getenv("OPENAI_API_KEY")


def translate_query(text: str) -> Tuple[str, str | None]:
    """Translate non-English text to English using ChatGPT."""
    sys_prompt = (
        "You detect the language of the user text. If it's English, reply with JSON: {\"language\": \"en\", \"translation\": \"text\"}. "
        "If not, translate to English and respond JSON with language code and translation."
    )
    resp = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": sys_prompt}, {"role": "user", "content": text}],
        max_tokens=100,
        temperature=0,
    )
    try:
        data = json.loads(resp.choices[0].message.content)
        lang = data.get("language", "en")
        trans = data.get("translation", text)
    except Exception:
        lang, trans = "en", text
    if lang == "en":
        return text, None
    return trans, lang


def rank_partners(query: str, innovators: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    weights: List[Tuple[float, Dict[str, Any]]] = []
    q_lower = query.lower()
    total = database.total_history()
    for inv in innovators:
        base = 1.0 if inv.get("domain", "").lower() in q_lower else 0.0
        base += 0.5 if inv["name"].lower() in q_lower else 0.0
        base *= database.get_partner_weight(inv["name"])
        s, f = database.pair_stats(inv["name"])
        n = s + f
        if n == 0:
            ucb = float("inf")
        else:
            avg = (s - f) / n
            ucb = avg + math.sqrt(2 * math.log(total + 1) / n)
        weights.append((base * ucb, inv))
    weights.sort(key=lambda x: x[0], reverse=True)
    return [w[1] for w in weights[:3]]


def build_markdown(query: str, lang: str | None, partners: List[Dict[str, Any]], stats: Tuple[int, int]) -> str:
    lines = [f"## Roadmap for: {query}"]
    if lang:
        lines.append(f"_Translated from {lang}_")
    lines.append("")
    lines.append("### Selected Partners")
    for p in partners:
        lines.append(f"- **{p['name']}** ({p.get('domain','')})")
    lines.append("")
    lines.append(f"Memory success: {stats[0]}, fail: {stats[1]}")
    lines.append("")
    lines.append("### Impact Scores")
    for a in partners:
        for b in partners:
            if a == b:
                continue
            score = causal.estimate_impact(a, b)
            lines.append(f"- {a['name']} -> {b['name']}: {score}")
    return "\n".join(lines)


def run_agents(query: str) -> str:
    """Simple LangGraph pipeline."""
    scout = rag_loader.retrieve_context(query)
    resp1 = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "Analyse context"}, {"role": "user", "content": scout}],
        max_tokens=100,
    )
    analyst = str(resp1.choices[0].message.content)
    resp2 = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "Create plan"}, {"role": "user", "content": analyst}],
        max_tokens=200,
    )
    plan = str(resp2.choices[0].message.content)
    return plan


def run_query(text: str, innovators_path: str) -> Tuple[str, nx.Graph, List[Dict[str, Any]], str | None]:
    innovators = gui_utils.load_innovators(innovators_path)
    database.init_db()
    trans, lang = translate_query(text)
    partners = rank_partners(trans, innovators)
    stats = database.get_stats()
    plan = run_agents(trans)
    md = build_markdown(text if not lang else trans, lang, partners, stats)
    md += "\n\n" + plan
    g = gui_utils.build_graph(innovators)
    return md, g, partners, lang


def main() -> None:
    parser = argparse.ArgumentParser(description="Artificial Innovator AI Plus")
    parser.add_argument("ask_file", help="path to query text file")
    parser.add_argument("--feedback", choices=["success", "fail"], help="result of previous roadmap")
    parser.add_argument("--viz", action="store_true", help="show graph window")
    parser.add_argument("--innovators", default="innovators.json")
    args = parser.parse_args()

    text = Path(args.ask_file).read_text(encoding="utf-8")
    md, g, partners, _ = run_query(text, args.innovators)
    print(md)
    if args.feedback:
        for p in partners:
            for other in partners:
                if p == other:
                    continue
                database.log_history(p['name'], other['name'], args.feedback)
    if args.viz:
        import matplotlib.pyplot as plt
        img = gui_utils.graph_image(g, {"synergy", "supply_chain", "conflict"})
        plt.imshow(plt.imread(BytesIO(img)))
        plt.axis('off')
        plt.show()


if __name__ == "__main__":
    main()
