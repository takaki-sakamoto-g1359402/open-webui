from pathlib import Path
from typing import List
import matplotlib.pyplot as plt
import networkx as nx


def filtered_graph(graph: nx.MultiDiGraph, edge_types: List[str]) -> nx.MultiDiGraph:
    g = nx.MultiDiGraph()
    g.add_nodes_from(graph.nodes(data=True))
    for u, v, d in graph.edges(data=True):
        if d.get("type") in edge_types:
            g.add_edge(u, v, **d)
    return g

def save_graph_png(graph: nx.MultiDiGraph, path: Path) -> None:
    plt.figure(figsize=(8, 6))
    pos = nx.spring_layout(graph)
    nx.draw_networkx(graph, pos, node_size=500, with_labels=True)
    labels = nx.get_edge_attributes(graph, "type")
    nx.draw_networkx_edge_labels(graph, pos, edge_labels=labels)
    plt.savefig(path)
    plt.close()
