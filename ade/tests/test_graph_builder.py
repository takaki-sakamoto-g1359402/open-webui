"""Tests for graph builder."""

from ade import data_loader, graph_builder


def test_build_graph(tmp_path) -> None:
    contacts, interactions, events = data_loader.load_local_data(tmp_path)
    G = graph_builder.build_graph(contacts, interactions, events)
    assert G.number_of_nodes() > 0
    assert G.number_of_edges() > 0
