"""Knowledge graph builder."""

from __future__ import annotations

import logging
from typing import Tuple

import networkx as nx
import pandas as pd

logger = logging.getLogger(__name__)


def build_graph(contacts: pd.DataFrame, interactions: pd.DataFrame, events: pd.DataFrame) -> nx.MultiDiGraph:
    """Create a directed multigraph from data.

    Args:
        contacts: Contacts DataFrame.
        interactions: Interactions DataFrame.
        events: Events DataFrame.

    Returns:
        Populated MultiDiGraph.
    """
    G = nx.MultiDiGraph()
    # Add person nodes
    for _, row in contacts.iterrows():
        G.add_node(f"person_{row['id']}", type="Person", **row.to_dict())
    # Add event nodes and location nodes
    for _, row in events.iterrows():
        event_id = f"event_{row['event_id']}"
        G.add_node(event_id, type="Event", **row.to_dict())
        loc = row["location"]
        G.add_node(loc, type="Location", name=loc)
        G.add_edge(event_id, loc, relationship="located_at")
        for pid in str(row["participants"]).split(";"):
            G.add_edge(f"person_{pid}", event_id, relationship="participated")
    # Add communication edges
    for _, row in interactions.iterrows():
        src = f"person_{row['source_id'] }"
        tgt = f"person_{row['target_id'] }"
        G.add_edge(src, tgt, relationship="communication", **row.to_dict())
    # Centrality
    centrality = nx.degree_centrality(G)
    nx.set_node_attributes(G, centrality, "centrality")
    return G
