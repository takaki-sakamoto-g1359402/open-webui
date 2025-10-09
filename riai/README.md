# Riai v1

Riai v1 is a local-first, safety-aligned autonomous agent that operates in a deterministic **Plan → Act → Reflect → Learn** cycle. The system is designed to be extensible, auditable, and easy to govern for research and prototype deployments.

```
+---------+       +---------+      +-----------+      +--------+
| Planner | ----> | Executor| ---> | Reflector | ---> |Learner |
+---------+       +---------+      +-----------+      +--------+
     ^                                                     |
     |                                                     v
     +-------------------- Memory & Safety ----------------+
```

## Features
- Hierarchical planning with deterministic seeds for reproducibility.
- Tool execution sandboxed by safety policies (command allow/deny lists, domain allowlist, rate limits).
- Reflection engine critiques intermediate results and proposes repairs within policy limits.
- Learner component stores episodic traces and reusable skills in SQLite.
- Local-only by default: no network access unless explicitly enabled.
- Structured JSON logging with full audit trail of every decision.

## Installation
1. Ensure Python ≥3.11 is available.
2. Create and activate a virtual environment.
3. Install the package in editable mode with development tools:
   ```bash
   pip install -e .[dev]
   ```

## Quick Start
```
riai run --goal "Summarize the local README" --max-steps 20 --config configs/config.yaml
```

### CLI Overview
- `riai run --goal "..."` – execute a run using the configured planner/executor.
- `riai tools list` – show registered tools and their safety constraints.
- `riai tools add --tool <name>` – enable an available tool in the configuration.
- `riai tools remove --tool <name>` – disable a tool for future runs.
- `riai eval examples/tasks/*.yaml` – replay canned evaluation scenarios.

## Adding a New Tool
1. Implement a new class in `src/riai/tools/` that subclasses `BaseTool`.
2. Define its metadata (`name`, `description`, `inputs`) and implement `run()` with built-in safety checks.
3. Register the tool in `configs/tools.yaml` or dynamically via the CLI.
4. Update `policies/safety.yaml` if new capabilities require additional governance.

## Enabling Web Access Safely
- Web access is off by default (`policies/safety.yaml` → `web.enabled: false`).
- To allow specific domains:
  1. Set `web.enabled: true`.
  2. Add fully qualified domains to `web.domain_allowlist`.
  3. Optionally adjust per-domain rate limits and timeouts in `configs/tools.yaml`.
- Never enable broad access; keep the allowlist minimal and review audit logs frequently.

## Logs & Memories
- Structured logs are written to stdout and optionally to files as configured in `configs/config.yaml`.
- Episodic memories and skills are stored in `data/memories.sqlite3`.
- To reset state, delete the SQLite file and restart the agent.

## Extending the Planner & Reflector
- Planner heuristics live in `src/riai/planner.py`. You can swap strategies or add new decomposition templates.
- Reflector logic resides in `src/riai/reflector.py`. Extend the rule set for richer self-critique and automated repair plans.

## Safety Policy Overview
- Safety configuration: `policies/safety.yaml` defines command allow/deny lists, domain allowlist, file sandbox, and rate limits.
- Update the YAML to customize organization-specific policies; changes are hot-reloaded for new runs.
- The agent always prefers the `refuse_and_explain` path when a request violates policy.

## Known Limitations
- Planner heuristics are template-based; they may require manual adjustments for complex domains.
- Reflection is conservative: it favors stopping over risky retries.
- Skill learning is simple frequency counting; advanced scoring is a future work item.
- The browser tool is a stub for offline evaluation only.

## Development Workflow
- Run tests: `pytest`
- Format & lint: rely on `ruff`/`black` if desired (not bundled by default).
- Example tasks live in `examples/tasks/`; evaluation notes in `examples/eval/checklist.md`.

## License
MIT License.
