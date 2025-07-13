"""Bootstrap ADE components."""

from __future__ import annotations

import logging

from . import data_loader, graph_builder, anomaly_detector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def bootstrap() -> None:
    """Load data and prepare graph."""
    contacts, interactions, events = data_loader.load_local_data()
    interactions = anomaly_detector.detect_anomalies(interactions)
    G = graph_builder.build_graph(contacts, interactions, events)
    anomaly_detector.mark_anomalies(G, interactions)
    logger.info("Graph has %d nodes and %d edges", G.number_of_nodes(), G.number_of_edges())


if __name__ == "__main__":
    bootstrap()
