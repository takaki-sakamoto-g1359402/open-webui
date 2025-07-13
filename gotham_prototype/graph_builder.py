"""Graph construction and analysis utilities."""

from __future__ import annotations

import logging
from dataclasses import dataclass
import networkx as nx
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class GraphBuilder:
    """Construct graphs from data and compute centrality metrics."""

    def build_graph(
        self,
        contacts: pd.DataFrame,
        interactions: pd.DataFrame,
        events: pd.DataFrame,
    ) -> nx.Graph:
        """Return a NetworkX graph built from contacts, interactions, and events."""
        g = nx.Graph()

        # Add contact nodes
        for _, row in contacts.iterrows():
            g.add_node(row['id'], label=row['name'], type='Person', role=row.get('role'))

        # Add event nodes and location nodes
        for _, row in events.iterrows():
            event_id = f"event_{row['event_id']}"
            g.add_node(event_id, label=row['name'], type='Event')
            g.add_node(row['location'], type='Location')
            g.add_edge(event_id, row['location'], relation='located_at')
            participants = str(row.get('participants', ''))
            for pid in participants.split(';') if participants else []:
                if pid:
                    g.add_edge(pid, event_id, relation='participated_in')

        # Add interaction edges
        for _, row in interactions.iterrows():
            g.add_edge(
                row['source_id'],
                row['target_id'],
                relation=row.get('channel', 'interaction'),
                volume=row.get('volume', 1),
            )

        logger.info("Graph built with %d nodes and %d edges", g.number_of_nodes(), g.number_of_edges())
        return g

    def compute_centrality(self, graph: nx.Graph) -> pd.DataFrame:
        """Compute PageRank and BetweennessCentrality."""
        logger.info("Computing centrality metrics")
        pr = nx.pagerank(graph)
        bc = nx.betweenness_centrality(graph)
        df = (
            pd.DataFrame({'pagerank': pr, 'betweenness': bc})
            .sort_values('pagerank', ascending=False)
            .reset_index()
            .rename(columns={'index': 'node'})
        )
        return df
