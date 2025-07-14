# Artificial Innovator AI Plus (AIAI-P)

AIAI-P suggests innovation partners and roadmaps.
It extends the Gotham prototype with translation, memory, causal impact, a Streamlit dashboard, and an auto-run scheduler. Version 2 adds vector search, a FastAPI plugin, Docker support and CI/CD.

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

### Docker
```
docker-compose up --build
```
Runs the API on :8000, Streamlit GUI on :8501, and the worker.

### Plugin
```
POST /roadmap {"query": "text", "lang": "en"}
```
See `ai-plugin.json` for Assistants API usage.
