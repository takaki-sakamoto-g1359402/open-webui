# Aether Atelier

Playable MVP for a browser-based 3D voxel settlement sandbox with original anime-style settlement characters and transparent pseudo-personality simulation.

## MVP Features

- 3D voxel terrain using TypeScript, Vite, Babylon.js, and Rapier.
- Block placement/removal with meaningful building markers.
- Building effects for houses, storage, workshops, roads, and civic beacons.
- Settlement resources, population/storage capacity, morale, alerts, and event feed.
- Five original anime-style low-poly character companions with visible profile data, needs, mood, goals, task queues, memory logs, visual themes, and directives.
- Character inspection and comparison HUD.
- Click or `Tab` inspection for character state.
- Local save/load for settlement buildings, resources, and character state.

## Controls

- `WASD` move
- `Space` jump
- `Shift` sprint
- `F` flight
- `Q` dash
- `X` surge charge
- `1-5` select building mode
- `E` place selected building block
- `R` remove targeted block
- Click character inspect target
- `Tab` inspect next character
- `T` cycle selected character directive
- `O` save locally
- `P` load locally

## Local Development

Use the bundled Node runtime if `npm` is unavailable in this environment.

```bash
/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./scripts/validate-types.mjs
/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vite/bin/vite.js build --emptyOutDir
/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173
```

Local URL:

- [http://127.0.0.1:4173](http://127.0.0.1:4173)

## Cloudflare Pages

The intended production artifact is `dist`.

```bash
npm run build
npm run cf:deploy
```

If local Wrangler auth is unavailable, the repo also has a direct deploy helper:

```bash
/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/deploy-pages.mjs --directory dist --project new-project-20260305-053022 --account-id 751eaafd005857ababca40d6af72b843 --branch main
```

## FounderVerse WebGL Demo Deployment

FounderVerse can be distributed as a Unity WebGL demo through Cloudflare Pages.

Recommended deployment flow:

1. Open the Unity project.
2. Switch Platform to WebGL.
3. Build to `Build/WebGL`.
4. Confirm `index.html`, `Build/`, and `TemplateData/` exist.
5. Add `_headers` if compressed WebGL files are used.
6. Deploy `Build/WebGL` to Cloudflare Pages.
7. Copy the generated `pages.dev` URL.
8. Share the URL privately with alpha testers.

Demo URL:

```text
TBD after successful deployment
```

Detailed deployment and release checks:

- [docs/Deploy_Unity_WebGL_Cloudflare_Pages.md](docs/Deploy_Unity_WebGL_Cloudflare_Pages.md)
- [docs/FounderVerse_Distribution_Checklist.md](docs/FounderVerse_Distribution_Checklist.md)
- [docs/FounderVerse_Deployment_Status.md](docs/FounderVerse_Deployment_Status.md)
- [docs/FounderVerse_Unity_Build_Automation.md](docs/FounderVerse_Unity_Build_Automation.md)

Important:

This MVP uses mock data only. It does not collect real identity documents. It does not connect to KYC vendors, payment providers, government APIs, or external identity providers. It only demonstrates platform-level verification states and room access rules.

## Safety Framing

Pseudo-personality agents are explicit in-game simulation profiles. They are not real identity replicas, impersonation systems, authentication artifacts, or hidden influence tools. The MVP keeps behavior rule-based and inspectable.
