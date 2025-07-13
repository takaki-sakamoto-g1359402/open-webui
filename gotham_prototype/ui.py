"""Streamlit user interface."""

from __future__ import annotations

import logging
from pathlib import Path

import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt

from .data_loader import DataLoader
from .graph_builder import GraphBuilder
from .anomaly_detector import AnomalyDetector
from .auth import AuthManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "sample_data"

def load_data() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load contacts, interactions, and events from sample data."""
    loader = DataLoader()
    contacts = loader.load_csv(DATA_DIR / "contacts.csv")
    interactions = loader.load_csv(DATA_DIR / "interactions.csv")
    events = loader.load_csv(DATA_DIR / "events.csv")
    return contacts, interactions, events

def show_dashboard(contacts: pd.DataFrame, interactions: pd.DataFrame, events: pd.DataFrame) -> None:
    """Display the dashboard tab."""
    st.header("Dashboard")

    # Time-series visualization of interaction volume
    ts = interactions.copy()
    ts['timestamp'] = pd.to_datetime(ts['timestamp'])
    ts = ts.set_index('timestamp').resample('D')['volume'].sum()

    detector = AnomalyDetector()
    kpi_df = detector.detect_kpi_anomalies(ts)

    fig, ax = plt.subplots()
    ax.plot(kpi_df.index, kpi_df['value'], label='Volume')
    ax.scatter(
        kpi_df.index[kpi_df['anomaly']],
        kpi_df['value'][kpi_df['anomaly']],
        color='red',
        label='Anomaly',
    )
    ax.legend()
    st.pyplot(fig)


def show_deep_analysis(contacts: pd.DataFrame, interactions: pd.DataFrame, events: pd.DataFrame) -> None:
    """Display the deep analysis tab."""
    st.header("Deep Analysis")
    builder = GraphBuilder()
    graph = builder.build_graph(contacts, interactions, events)
    centrality = builder.compute_centrality(graph)
    st.dataframe(centrality.head())

    detector = AnomalyDetector()
    traffic = detector.detect_traffic_anomalies(interactions)
    st.dataframe(traffic[traffic['anomaly']])


def show_settings() -> None:
    """Display settings tab."""
    st.header("Settings")
    st.write("Role-based access applies")


def main() -> None:
    """Run the Streamlit UI with login and role-based views."""
    st.title("Mini Gotham Prototype")
    auth = AuthManager()
    if 'role' not in st.session_state:
        with st.form('login'):
            username = st.text_input('Username')
            password = st.text_input('Password', type='password')
            submitted = st.form_submit_button('Login')
            if submitted:
                role = auth.authenticate(username, password)
                if role:
                    st.session_state['role'] = role
                    st.experimental_rerun()
                else:
                    st.error('Invalid credentials')
        st.stop()

    role = st.session_state['role']
    st.sidebar.write(f"Logged in as {role}")

    contacts, interactions, events = load_data()

    tab1, tab2, tab3 = st.tabs(["Dashboard", "Deep Analysis", "Settings"])
    with tab1:
        show_dashboard(contacts, interactions, events)
    with tab2:
        if role in {'admin', 'analyst'}:
            show_deep_analysis(contacts, interactions, events)
        else:
            st.write("Insufficient permissions")
    with tab3:
        if role == 'admin':
            show_settings()
        else:
            st.write("Insufficient permissions")


if __name__ == "__main__":
    main()
