"""Streamlit dashboard for AIAI-P."""

from __future__ import annotations

import streamlit as st
from io import BytesIO
from typing import List

from . import aiai_p, gui_utils


st.set_page_config(page_title="AIAI-P Dashboard", layout="wide")

if 'innovators' not in st.session_state:
    st.session_state['innovators'] = 'innovators.json'

st.sidebar.header("Data")
upload = st.sidebar.file_uploader("Upload innovators.json", type="json")
if upload:
    path = 'uploaded_innovators.json'
    with open(path, 'wb') as f:
        f.write(upload.getbuffer())
    st.session_state['innovators'] = path

query = st.text_area("Enter query", "")
run = st.button("Generate Roadmap")
edge_opts = st.multiselect(
    "Edge types", ["synergy", "supply_chain", "conflict"], ["synergy", "supply_chain", "conflict"]
)

if run and query:
    md, g, partners, lang = aiai_p.run_query(query, st.session_state['innovators'])
    st.markdown(md)
    img = gui_utils.graph_image(g, edge_opts)
    st.image(BytesIO(img))
