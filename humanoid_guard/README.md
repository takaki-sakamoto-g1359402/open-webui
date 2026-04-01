# Humanoid Guard

This proof-of-concept server allows **Riai** to assign tasks to robots via HTTP endpoints and MQTT.

## Quick Start
```bash
export MQTT_BROKER=broker.emqx.io
uvicorn humanoid_guard.main:app --reload
```

## TODO
- JWT auth hardening
- LLM planner integration (OpenAI GPT-4o)
- Kubernetes deployment notes
- Audit log API to satisfy JP AI Promotion Act & EU AI Act
