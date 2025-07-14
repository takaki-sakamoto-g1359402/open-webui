"""Streamlit dashboard for AIAI-P."""

from __future__ import annotations

import streamlit as st
from io import BytesIO
import os
import gettext

from . import aiai_p, gui_utils


locale = os.getenv("LANG", "en")[:2]
trans = gettext.translation("messages", localedir="locales", languages=[locale], fallback=True)
_ = trans.gettext

ENABLE_SSO = bool(os.getenv("AUTH0_DOMAIN"))

st.set_page_config(page_title="AIAI-P Dashboard", layout="wide")

if ENABLE_SSO:
    role = st.sidebar.selectbox("Role", ["viewer", "editor", "admin"])
    st.session_state['role'] = role

if 'innovators' not in st.session_state:
    st.session_state['innovators'] = 'innovators.json'

st.sidebar.header(_("Data"))
upload = st.sidebar.file_uploader(_("Upload innovators.json"), type="json")
if upload:
    path = 'uploaded_innovators.json'
    with open(path, 'wb') as f:
        f.write(upload.getbuffer())
    st.session_state['innovators'] = path

query = st.text_area(_("Enter query"), "")
run = st.button(_("Generate Roadmap"))
edge_opts = st.multiselect(
    _( "Edge types" ), ["synergy", "supply_chain", "conflict"], ["synergy", "supply_chain", "conflict"]
)

if run and query:
    md, g, partners, lang = aiai_p.run_query(query, st.session_state['innovators'])
    st.markdown(md)
    img = gui_utils.graph_image(g, edge_opts)
    st.image(BytesIO(img))
