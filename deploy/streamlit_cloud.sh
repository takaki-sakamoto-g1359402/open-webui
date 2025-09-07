#!/bin/bash
set -e
pip install -r aiai_p/requirements.txt
streamlit run aiai_p/ui/app.py
