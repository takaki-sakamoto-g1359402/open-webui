# Run Results

Date: 2026-04-29

Environment:

- Local machine via Codex Desktop 5.5
- `python3 --version`: Python 3.9.6
- Note: `python` was not available in this shell, so validation used `python3`.

Commands run from `generative_agent_proto/`:

```bash
python3 -m generative_agents.demo
python3 -m unittest discover tests
```

Result:

- Demo completed successfully.
- Unit tests completed successfully.
- Test summary: `Ran 5 tests in 0.003s - OK`

Demo coverage:

- Two agents observed the same shared environment event.
- Observation memory records were stored to local JSONL.
- Top-k retrieval produced recency, importance, relevance, and final scores.
- A grounded reflection was created with supporting memory IDs.
- A daily plan was generated.
- A conflicting event triggered plan reconsideration and modification.
- A failed action produced a postmortem.
- A reusable heuristic was extracted and retrieved.
