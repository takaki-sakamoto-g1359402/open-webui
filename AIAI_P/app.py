"""Streamlit dashboard for AIAI Plus."""
from pathlib import Path
import streamlit as st
from AIAI_P.aiai_p import AIAIPlus


def main() -> None:
    st.title("Artificial Innovator AI Plus")
    uploaded = st.file_uploader("innovators.json", type="json")
    if uploaded:
        data_path = Path("uploaded_innovators.json")
        data_path.write_bytes(uploaded.read())
    else:
        data_path = Path("innovators.json")
    query = st.text_area("Query")
    types = st.multiselect(
        "Edge types", ["synergy", "conflict", "supply-chain"],
        default=["synergy", "conflict", "supply-chain"],
    )
    if st.button("Generate"):
        tmp = Path("_gui_query.txt")
        tmp.write_text(query)
        app = AIAIPlus(str(data_path))
        out = app.make_roadmap(str(tmp))
        st.markdown(Path(out).read_text())
        img = Path(out).with_suffix(".png")
        app.export_graph(img, types)
        st.image(str(img))


if __name__ == "__main__":
    main()
