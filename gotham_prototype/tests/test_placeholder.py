"""Test stubs for the Gotham prototype."""

from pathlib import Path
import pandas as pd
from gotham_prototype import data_loader, graph_builder, anomaly_detector, auth


def test_load_csv(tmp_path):
    path = tmp_path / "sample.csv"
    path.write_text("a,b\n1,2\n")
    loader = data_loader.DataLoader()
    df = loader.load_csv(path)
    assert not df.empty


def test_authenticate_success():
    auth_mgr = auth.AuthManager()
    assert auth_mgr.authenticate('admin', 'admin') == 'admin'


def test_graph_building():
    contacts = pd.DataFrame({'id': ['p1'], 'name': ['A']})
    interactions = pd.DataFrame({'source_id': ['p1'], 'target_id': ['p1']})
    events = pd.DataFrame({'event_id': ['e1'], 'name': ['E'], 'location': ['L']})
    builder = graph_builder.GraphBuilder()
    g = builder.build_graph(contacts, interactions, events)
    assert g.number_of_nodes() > 0
