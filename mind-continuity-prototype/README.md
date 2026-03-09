# Continuity Protocol Prototype

## 1) Game Concept Summary

- **Genre**: Narrative systems game / interactive fiction with systemic state tracking.
- **Player fantasy**: You are not just choosing dialogue—you are governing competing versions of yourself during a legal/technical identity crisis.
- **Core emotional experience**: Quiet existential tension, intimate self-confrontation, and unease around whether memory continuity equals personhood.
- **Core gameplay loop**:
  1. Read scenario node grounded in WBE operations.
  2. Hear conflicting advice from internal copies.
  3. Commit to one policy choice.
  4. Watch identity metrics shift (`Continuity Confidence`, `Drift`).
  5. Receive ending that reflects philosophical posture.
- **Win/failure structure**: No binary victory. Endings classify the identity outcome as Narrow Continuity, Fragmented Continuity, or Divergent Multiplicity.
- **Replayability angle**: Different choice combinations alter metrics and endings; identity ledger records path for self-comparison.

## 2) Three Possible Directions

### Direction A — **Continuity Protocol** (implemented)
- **One-sentence pitch**: A compact, replayable deliberation session where your copied minds debate who deserves to be "you".
- **Gameplay summary**: Four high-impact scenes, each with distinct policy choices and copy voices; hidden tensions surfaced through confidence/drift metrics.
- **Technical scope**: Low-to-medium; static HTML/CSS/JS, localStorage save, branching endings.
- **Why interesting**: Strong philosophical payload with minimum production cost and clear expansion path.
- **Prototype suitability**: **Best first prototype** due to clear loop and 1–2 minute session length.

### Direction B — **Fork Archive**
- **One-sentence pitch**: A timeline board where each decision spawns a new self-thread you can revisit and reconcile.
- **Gameplay summary**: Players branch into multiple tracks, then perform periodic synchronization votes between copies.
- **Technical scope**: Medium-high; requires graph UI, branch persistence, and reconciliation mechanics.
- **Why interesting**: Visually communicates identity forking and consequence topology.
- **Prototype suitability**: Good second milestone after a stable single-thread MVP.

### Direction C — **Embodiment Rights Tribunal**
- **One-sentence pitch**: You defend one copy in a procedural hearing while other copies cross-examine your claims to selfhood.
- **Gameplay summary**: Argument crafting, evidence cards (memories), and tribunal rulings with body assignment consequences.
- **Technical scope**: Medium; needs lightweight card/dialogue system and scoring heuristics.
- **Why interesting**: Strong dramatic framing and commercial narrative potential.
- **Prototype suitability**: Excellent vertical slice later, but slower to ship than Direction A.

## 3) Chosen Direction and Why

**Chosen: Direction A — Continuity Protocol**.

This direction is most production-viable for an MVP because it creates immediate playable tension, expresses identity continuity as a measurable system, and can be shipped as dependency-free static files. It can later expand into timeline visualization, additional body types, or courtroom framing without refactoring core state logic.

## 4) Implementation

### File Structure

```
mind-continuity-prototype/
├── index.html
├── style.css
├── app.js
└── README.md
```

### Implementation Plan

1. Create title screen and concise fiction setup.
2. Implement four-scene narrative data model.
3. Add choice handling with state metrics and history ledger.
4. Build multi-ending resolution logic based on confidence/drift thresholds.
5. Add local save/resume/clear to support replay.
6. Polish UI for readability and mood.

### Major Systems

- **Narrative Node System**: Scene data stored as plain JS objects (`title`, `text`, `voices`, `choices`) to keep content modular.
- **Identity Metrics**:
  - `confidence`: How strongly the system believes one continuity narrative.
  - `drift`: How far copies diverge from a unified identity model.
- **Choice Application**: Each choice mutates metrics and appends an identity-ledger entry.
- **Ending Resolver**: Threshold logic maps final metric profile to one of three thematic outcomes.
- **Persistence**: Session snapshot stored in `localStorage` for resume support.

### Next-Step Improvements

1. Add timeline view showing branch alternatives not taken.
2. Introduce body capability stats (biological/robotic/virtual) with tradeoffs.
3. Add probabilistic memory corruption and synchronization rituals.
4. Add ambient audio + subtle motion effects for atmosphere.
5. Expand endings into post-session epilogues (family/legal/social fallout).
6. Export run history as JSON for players comparing identity philosophies.
