# Event flows

## Redis Streams events scaffolded now

- `space.user_joined`
- `digital_twin.registered`
- `task.submitted`
- `policy.denied`
- `task.executed`
- `robot.action.requested`
- `robot.action.blocked`
- `robot.action.simulated`

## Task flow

1. API persists `Task`.
2. API publishes `task.submitted`.
3. Worker consumes the event.
4. Worker evaluates policy.
5. Worker writes `PolicyDecision`.
6. Worker persists a single `TaskRun` per task attempt.
7. Worker emits execution outcome events.

## Why Redis Streams

Streams give replayable consumer-group semantics, are simple to run locally, and provide an acceptable first event backbone before introducing more infrastructure.
