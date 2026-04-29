# Voxel Personality Sandbox MVP Plan

## Goal
Ship a playable browser MVP of a 3D voxel settlement sandbox where transparent pseudo-personality agents live, work, remember, and react to the player's building choices.

## Current Execution Checklist
- [x] Produce architecture-first MVP design.
- [x] Inspect existing Vite/Babylon voxel project.
- [x] Add project-control docs.
- [x] Add typed personality profiles and sample agents.
- [x] Add building definitions and gameplay effects.
- [x] Add settlement simulation: resources, capacity, alerts, logs.
- [x] Add agent simulation: needs, goals, task scoring, movement, memory.
- [x] Wire player building mode selection and block placement/removal.
- [x] Add HUD panels for settlement, selected agent, logs, and controls.
- [x] Add local persistence for settlement/player-created structures.
- [x] Run local type/build validation.
- [x] Run browser smoke checks for interaction and rendering.
- [x] Build production artifact.
- [x] Attempt Cloudflare Pages deployment.
- [ ] Verify live URL and static assets. Blocked by Cloudflare write authentication failure.

## MVP Boundaries
- Small local simulation, 3-10 agents.
- Deterministic rule-based behavior, no LLM/person impersonation.
- Grid-local pathing and simple goal selection.
- Lightweight UI and debug panels.
- No multiplayer, no auth, no backend persistence.

## Validation Contract
- Install succeeds or existing dependencies are usable.
- Dev server or preview runs.
- Production build succeeds.
- Block placement/removal works.
- At least one building effect works.
- At least one agent moves and updates state.
- Agent inspection UI works.
- Event/log feed is visible.
- No blocking runtime crash in the basic gameplay path.
