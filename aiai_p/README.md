# Artificial Innovator AI Plus (AIAI-P)

Modular research assistant that suggests innovation partners and roadmaps. It supports multilingual queries, remembers past successes, estimates causal impact and exposes both CLI and Streamlit interfaces.

```
┌── cli/      # entrypoints
├── domain/   # pure logic
├── services/ # DB, OpenAI, RAG
└── ui/       # Streamlit utilities
```

## Requirements
- Python 3.11
- An OpenAI API key in `OPENAI_API_KEY`
- See `requirements.txt` for Python dependencies

## Usage

### CLI
```
python -m aiai_p.cli.main ask.txt [--feedback success|fail] [--viz]
```

### GUI
```
streamlit run app.py

```
Upload `innovators.json`, enter a query, and view results.

### Scheduler
```
python -m aiai_p.cli.scheduler
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
