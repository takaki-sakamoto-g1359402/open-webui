# Architecture

## Why this shape

The platform needs strong boundaries without early distributed-systems drag. A modular monorepo keeps domain seams explicit while preserving a single local developer workflow.

## Runtime components

1. **API application**: FastAPI-based control plane.
2. **Worker**: Redis Streams consumer for asynchronous task handling.
3. **PostgreSQL**: source of truth for identity, spaces, twins, tasks, policy decisions, and audits.
4. **Redis**: event backbone and workflow trigger bus.

## Bounded domains

- **Identity & access**: users, roles, local auth, future service credentials.
- **World-space management**: spaces, sessions, participants.
- **Digital twin registry**: twins attached to spaces.
- **Agent orchestration**: agents, tasks, task runs.
- **Policy & safety**: policies and policy decisions.
- **Device bridge**: devices, bridges, simulation-only execution.
- **Observability & audit**: request IDs, logs, audit logs, event checkpoints.

## Evolution path

This layout can later split into independently deployed services by extracting modules behind their service interfaces while preserving DB ownership and event contracts.
