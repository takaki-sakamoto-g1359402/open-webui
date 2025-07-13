"""Streamlit interface for ADE."""

from __future__ import annotations

import io
import logging
from pathlib import Path

import matplotlib.pyplot as plt
import networkx as nx
import pandas as pd
import streamlit as st

from . import data_loader, graph_builder, anomaly_detector
from .agents.policy_agent import PolicyAgent
from .agents.risk_agent import RiskAgent
from .agents.ethics_agent import EthicsAgent
from .agents.sim_agent import SimAgent
from .orchestrator import AgentOrchestrator
from .auth import login, current_user, has_role

class StreamlitHandler(logging.Handler):
    """Logging handler that stores logs in session state."""

    def emit(self, record: logging.LogRecord) -> None:
        if "logs" not in st.session_state:
            st.session_state.logs = []
        st.session_state.logs.append(self.format(record))


logger = logging.getLogger("ADE")
logger.setLevel(logging.INFO)
logger.addHandler(StreamlitHandler())


@st.cache_data
def load_everything() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, nx.MultiDiGraph]:
    """Load data and build graph."""
    contacts, interactions, events = data_loader.load_local_data(Path("data"))
    api_users = data_loader.load_api_users()
    if not api_users.empty:
        contacts = pd.concat([contacts, api_users.rename(columns={"id": "id"})], ignore_index=True)
    interactions = anomaly_detector.detect_anomalies(interactions)
    G = graph_builder.build_graph(contacts, interactions, events)
    anomaly_detector.mark_anomalies(G, interactions)
    return contacts, interactions, events, G


def show_graph(G: nx.MultiDiGraph) -> None:
    """Display graph using matplotlib."""
    pos = nx.spring_layout(G)
    colors = ["red" if G.nodes[n].get("anomaly") else "skyblue" for n in G.nodes]
    plt.figure(figsize=(6, 4))
    nx.draw(G, pos, node_color=colors, with_labels=False, node_size=50)
    st.pyplot(plt.gcf())


def main() -> None:
    """Run the Streamlit dashboard."""
    st.set_page_config(page_title="ADE", layout="wide")
    if "user" not in st.session_state:
        st.session_state.logs = []
    st.title("Autonomous Decision Ecosystem")
    if not current_user():
        with st.form("login"):
            username = st.text_input("Username")
            role = st.selectbox("Role", ["admin", "analyst", "viewer"])
            if st.form_submit_button("Login"):
                login(username, role)
                st.experimental_rerun()
        return

    contacts, interactions, events, G = load_everything()

    policy = PolicyAgent("policy", G)
    risk = RiskAgent("risk", G)
    ethics = EthicsAgent("ethics", G)
    sim = SimAgent("sim", G)
    orchestrator = AgentOrchestrator(policy, risk, ethics, sim)

    tabs = st.tabs(["Dashboard", "Agent Chat", "Scenario Simulator", "Graph"])

    with tabs[0]:
        st.subheader("Data Overview")
        st.write("Contacts", contacts.head())
        st.write("Interactions", interactions.head())
        st.write("Events", events.head())

    with tabs[1]:
        st.subheader("Agent Conversation")
        actions = orchestrator.run()
        st.write("Ranked Actions", actions)

    with tabs[2]:
        st.subheader("Scenario Simulator")
        st.write(sim.plan())

    with tabs[3]:
        st.subheader("Graph View")
        show_graph(G)

    st.sidebar.header(f"Logged in as {current_user().name} ({current_user().role})")
    st.sidebar.write("Logs:")
    st.sidebar.write("\n".join(st.session_state.get("logs", [])))


if __name__ == "__main__":
    main()
