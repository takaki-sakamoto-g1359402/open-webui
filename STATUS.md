# Voxel Personality Sandbox MVP Status

## 2026-04-24
- Selected TypeScript + Vite + Babylon.js because the existing repository already contains a playable voxel prototype with Babylon rendering and voxel terrain.
- Chose an incremental evolution strategy instead of a rewrite to preserve known-working rendering, physics, input, and build setup.
- Cloudflare Pages remains the preferred deployment target because this is a static frontend-heavy prototype.
- Git checkpoint branch creation was attempted before major edits but failed: the sandbox could not create the `.git/refs/heads/codex/voxel-personality-mvp.lock` file. Work continues without modifying Git refs.
- Implemented the MVP as "Replica Commons": a voxel settlement sandbox with building effects, resources, transparent pseudo-personality agents, needs, mood, task scoring, memory logs, directives, inspection UI, event feed, and local save/load.
- Retired the old combat loop from active gameplay update so the prototype reads as a settlement sandbox rather than an action-combat prototype.
- Local TypeScript/import validation passed across 24 files.
- Production Vite build succeeded after removing a macOS provenance extended attribute from Rollup's local optional native binary in `node_modules`.
- Browser/IAB smoke testing loaded the local production preview, found no console errors, verified core HUD visibility, build mode change, agent inspection/directive change, local save feedback, block placement, block removal, event feed visibility, and live agent activity logs.
- Browser/IAB screenshot capture timed out on the WebGL page; Playwright fallback could not run because the bundled Playwright Chromium executable is not installed.
- Cloudflare API connector can read the account and list Pages projects, but write operations failed with `10000: Authentication error` when attempting project creation and upload-token retrieval.
- Local Wrangler `whoami` and `wrangler pages deploy` did not return output in non-interactive mode.
- Repo direct deploy script attempted `dist` deployment to `new-project-20260305-053022` and failed with `401 10000: Authentication error`, so no new public URL was produced.

## Safety Framing
- Personality replicas are represented only as transparent, editable game simulation profiles.
- Profiles do not claim to be real humans, hidden influence systems, authentication artifacts, or identity impersonation.
- Agent explanations and memory logs are gameplay summaries generated from explicit simulation rules.
