# Artificial Innovator AI Plus (AIAI-P)

AIAI-P suggests innovation partners and roadmaps.
It extends the Gotham prototype with translation, memory, causal impact, a Streamlit dashboard, and an auto-run scheduler.

## Requirements
- Python 3.11
- An OpenAI API key in `OPENAI_API_KEY`
- See `requirements.txt` for Python dependencies

## Usage

### CLI
```
python aiai_p.py ask.txt [--feedback success|fail] [--viz]
```

### GUI
```
streamlit run app.py
```
Upload `innovators.json`, enter a query, and view results.

### Scheduler
```
python scheduler.py
```
Processes `queue/*.txt` every 24h, saving Markdown to `auto_out/`.
