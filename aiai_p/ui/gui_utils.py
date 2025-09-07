"""Shared utilities for graph and markdown."""

from __future__ import annotations

import json
from io import BytesIO
from typing import Any, Dict, Iterable, List, Tuple, cast

import matplotlib.pyplot as plt
import networkx as nx

from ..domain import causal
from ..services import db


def load_innovators(path: str) -> List[Dict[str, Any]]:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return cast(List[Dict[str, Any]], data)


def build_graph(innovators: List[Dict[str, Any]]) -> nx.Graph:
    g = nx.DiGraph()
    for inv in innovators:
        g.add_node(inv['name'], domain=inv.get('domain'))
    for inv in innovators:
        for partner in inv.get('synergy', []):
            g.add_edge(inv['name'], partner, type='synergy')
        for partner in inv.get('supply_chain', []):
            g.add_edge(inv['name'], partner, type='supply_chain')
        for partner in inv.get('conflict', []):
            g.add_edge(inv['name'], partner, type='conflict')
    return g


def graph_image(g: nx.Graph, types: Iterable[str]) -> bytes:
    sub = g.copy()
    if types:
        sub.remove_edges_from(
            [e for e in g.edges(data=True) if e[2].get("type") not in types]
        )
    pos = nx.spring_layout(sub)
    plt.figure(figsize=(6, 4))
    nx.draw(sub, pos, with_labels=True, node_color='lightblue', font_size=8)
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close()
    return buf.getvalue()


def build_markdown(
    query: str, lang: str | None, partners: List[Dict[str, Any]], stats: Tuple[int, int]
) -> str:
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

