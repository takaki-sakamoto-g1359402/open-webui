# Generative Agent Proto

Local, lightweight Python scaffold for cognitive generative agents. This is not
a chatbot wrapper. It is a small, extensible simulation core for observation,
memory, retrieval, reflection, planning, reconsideration, and experiential
learning.

No external APIs are called by default. No credentials are needed.

## Quick Start

```bash
cd generative_agent_proto
python -m generative_agents.demo
python -m unittest discover tests
```

On macOS setups where `python` is not installed, use `python3` for the same
commands.

The demo writes local JSONL memory files under `./data/`.

## Architecture Diagram

```text
SimulationEnvironment
  -> shared EnvironmentEvent log
  -> GenerativeAgent.observe(event)
       -> MemoryManager.store()
          -> WorkingMemory
          -> LongTermMemory JSONL
          -> ArchivalMemory stub
       -> Retrieval top-k
          -> recency + importance + toy relevance score
       -> ReflectionEngine
          -> grounded reflection memories
       -> Planner
          -> DailyPlan + PlanItem schedule
          -> reconsider + replan on conflict
       -> local simulated action
       -> ExperientialLearner
          -> trajectory
          -> postmortem
          -> reusable heuristic
          -> future heuristic retrieval
```

## Research Mapping

Paper-specific details were not locally verified because no PDFs or notes were
found. See `docs/README.md` for where to place sources.

Conceptual assumptions used in v0:

- Generative Agents: memory stream, importance, retrieval, reflection, and
  planning are represented by separate modules.
- Reflexion: failed actions generate natural-language postmortems that are
  stored and retrieved in future attempts.
- ExpeL: successful and failed trajectories are stored, then reusable
  heuristics are extracted for cross-task transfer.
- MemGPT: memory operations are explicit functions: store, retrieve, update,
  summarize, discard, page to long-term, and page to working memory.
- Cognitive design patterns: observe, reflect, plan, act, reconsider, and learn
  are explicit method boundaries rather than hidden prompt text.
- COPPER-style collaboration: v0 includes shared events and a placeholder for
  group reflection. Credit assignment is intentionally called out as unresolved.

## Project Structure

```text
generative_agent_proto/
  README.md
  pyproject.toml
  docs/
    README.md
  generative_agents/
    __init__.py
    models.py
    memory.py
    retrieval.py
    reflection.py
    planning.py
    learning.py
    environment.py
    agent.py
    demo.py
  tests/
    test_memory.py
    test_retrieval.py
    test_reflection.py
  data/
    .gitkeep
```

## Key Design Choices

- The toy embedding is normalized token frequency. Replace
  `retrieval.toy_embedding()` later with a local embedding model or vector DB.
- `reflection.call_llm()` is a deterministic stub. Replace it with a configured
  local or remote model adapter only after adding consent, audit, and privacy
  controls.
- Reflections require at least one supporting memory ID. Unsupported reflection
  storage raises `ValueError`.
- JSONL persistence is intentionally simple and inspectable for debugging.
- Multi-agent state is separated per agent, while events are shared through the
  environment log.

## Example Usage

```python
from generative_agents import AgentProfile, GenerativeAgent
from generative_agents.environment import SimulationEnvironment

env = SimulationEnvironment()
agent = GenerativeAgent(
    AgentProfile(
        agent_id="agent_a",
        name="Aya",
        goals=["repair shared infrastructure"],
    )
)

event = env.emit_event("The water pump reports low pressure.", "Workshop")
agent.observe(event)
agent.reflect()
plan = agent.plan_day()
```

## Known Limitations

- No real LLM, no real embeddings, and no autonomous external actions.
- Retrieval uses simple lexical overlap, so paraphrases are weak.
- Reflection quality is heuristic and can overgeneralize from little evidence.
- Planning is deterministic and schedule-based, not a full constraint solver.
- JSONL persistence is fine for v0 but should move to SQLite or another indexed
  store as memory grows.
- Group reflection and multi-agent credit assignment are placeholders.

## Roadmap

1. Add source-verified research notes in `docs/`.
2. Add SQLite persistence and indexed retrieval.
3. Add configurable local LLM and local embedding adapters.
4. Add memory privacy policies, retention controls, and deletion audit records.
5. Add stronger plan conflict detection and task precondition checks.
6. Add group reflection with explicit uncertainty and credit assignment.
7. Integrate into a small simulation or game loop with inspectable agent state.

## Ethics And Safety

- Memory privacy: long-term memory should be opt-in, inspectable, and scoped.
- Consent: user-related memory needs clear consent and purpose limits.
- Forgetting: deletion should remove active memory and any derived summaries
  where practical.
- Reflection errors: reflections can self-reinforce. Use confidence, review
  dates, supporting IDs, and human review for high-risk use.
- Overgeneralization: heuristics from few examples should stay low-confidence.
- Multi-agent risk: coordination can become manipulative or emergent in ways
  designers did not intend. Keep shared goals and behavior drivers visible.
- Audit logs: high-risk deployments need event, memory, decision, and action
  audit trails.
- External actions: v0 intentionally performs no autonomous external actions
  and accesses no secrets.
