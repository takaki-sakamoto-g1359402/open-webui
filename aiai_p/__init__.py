from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Tuple

import networkx as nx

from .domain import agents, bandit
from .services import db, openai_adapter
from .ui import gui_utils


def run_query(
    text: str, innovators_path: str
) -> Tuple[str, nx.Graph, List[Dict[str, Any]], str | None]:
    innovators = gui_utils.load_innovators(innovators_path)
    db.init_db()
    trans, lang = openai_adapter.translate_query(text)
    partners = bandit.rank_partners(trans, innovators)
    stats = db.get_stats()
    plan = agents.run_agents(trans)
    query = text if not lang else trans
    md = gui_utils.build_markdown(query, lang, partners, stats)
    md += "\n\n" + plan
    g = gui_utils.build_graph(innovators)
    return md, g, partners, lang

