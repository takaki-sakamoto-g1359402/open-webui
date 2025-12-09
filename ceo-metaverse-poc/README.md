# Executive-Only Virtual World Hub (CEO Metaverse Lobby) — Minimal PoC

This PoC maps the provided architecture (Cloudflare edge → Zero-Trust gate → executive lobby → three branches → outcomes/feedback) into a runnable, minimal stack. The backend is a lightweight Express server with WebSockets; the frontend is a CDN React single-page mock that exercises the flows. Data is in-memory for clarity.

## 1. Architecture (high level)
- **Secure Edge & Gate (Cloudflare + Zero Trust):** Cloudflare Access performs SSO/device checks and forwards a signed identity header (`x-cf-exec-identity`). The backend middleware validates it and enforces *executive-only* access. TLS/WAF/logging live at the edge (see `infra/cloudflare-zero-trust.md`).
- **Trunk (Executive Lobby):** `/api/users/me` + `/api/lobby/insights` expose identity and lightweight analytics that feed the lobby UI. Presence is updated per request.
- **Branches:**
  - **Branch A – Main Floor:** online presence + global chat via WebSocket (`/ws/chat`).
  - **Branch B – Private Areas:** CRUD-ish private rooms with invitations and room-scoped chat.
  - **Branch C – Game/MMO Hub:** mini-game listings plus external launch links (`minecraft://`, `steam://run/…`) with event logging.
- **Outcomes & Feedback:** interactions are logged as `InteractionEvent` and exposed via admin `/api/admin/events` and `/api/lobby/insights` for future AI (Riai) ingestion.

## 2. Services & Modules
**Backend (Express + ws):**
- `middleware` (in `server.js`): Cloudflare Access identity mock + role guards.
- `users`: `/api/users/me` current user profile.
- `lobby`: `/api/lobby/insights` aggregated interaction metrics.
- `main-floor`: `/api/main-floor/presence` + WebSocket chat for the global channel.
- `rooms`: create/list/invite/get private rooms + room-scoped chat via WebSocket.
- `hub`: list games/external links + launch endpoint that logs sessions.
- `events`: admin read-only endpoint for recent `InteractionEvent` records.

**Frontend (CDN React SPA):**
- `Lobby` view showing profile + insights + navigation.
- `MainFloor` showing online executives and global chat component.
- `PrivateRooms` to create/invite and chat per room.
- `GameHub` listing mini-games/external links and triggering launches.

## 3. Data Model (TypeScript-style)
```ts
export type AccessLevel = 'executive' | 'guest' | 'admin';

export interface User {
  id: string;
  name: string;
  company: string;
  role: string;
  reputationScore: number;
  accessLevel: AccessLevel;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  invitees: string[]; // user ids
  createdAt: string;
}

export type InteractionType =
  | 'MAIN_FLOOR_CHAT'
  | 'PRIVATE_ROOM_CHAT'
  | 'PRIVATE_ROOM_CREATED'
  | 'PRIVATE_ROOM_INVITE'
  | 'GAME_SESSION';

export interface InteractionEvent {
  id: string;
  type: InteractionType;
  participants: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
}
```

## 4. API Design
- `GET /api/users/me` — current user profile (exec/guest/admin).
- `GET /api/lobby/insights` — basic analytics (executive+).
- `GET /api/main-floor/presence` — online executives (executive+).
- `GET /api/rooms` — rooms owned or invited (executive+).
- `POST /api/rooms` — create room `{ name, description }` (executive+).
- `POST /api/rooms/:id/invite` — invite user `{ userId }` (owner exec/admin).
- `GET /api/rooms/:id` — room detail if invited (executive+).
- `GET /api/hub/games` — list mini-games/external game links (executive+).
- `POST /api/hub/games/:id/launch` — log launch and return URL (executive+).
- `GET /api/admin/events?limit=N` — list recent events (admin only).
- WebSocket `ws://host:4060/ws/chat?roomId=<optional>` — global chat when `roomId` absent; room chat when provided (requires same `x-cf-exec-identity` header).

## 5. Project Structure
```
ceo-metaverse-poc/
  README.md
  backend/
    package.json
    server.js
  frontend/
    index.html
  infra/
    cloudflare-zero-trust.md
```

## 6. Key Implementation Snippets
- **Server entry + middleware:** see `backend/server.js` for Express setup, Cloudflare identity validation, and role guards.
- **Lobby routes:** `/api/users/me`, `/api/lobby/insights` aggregate presence + events.
- **Main floor chat:** `/api/main-floor/presence` + WebSocket broadcast on `/ws/chat` when `roomId` missing.
- **Private rooms:** create/invite/get endpoints filter by owner/invitees; WebSocket uses `roomId` to isolate messages.
- **Game/MMO hub:** `/api/hub/games` returns mini-game + external links; `/api/hub/games/:id/launch` logs `GAME_SESSION` and returns launch URL (can be `minecraft://` or `steam://run/APPID`).
- **Analytics/admin:** `/api/admin/events` exposes recent `InteractionEvent` logs for SecOps/AI; `/api/lobby/insights` surfaces “most frequent interaction” and “top active room.”

## 7. Evolution (PoC → MVP)
- **Security hardening:** replace mock header with real Cloudflare Access JWT validation; enforce mTLS between services; rate-limit chat; persist audit logs to PostgreSQL with retention + tamper-evidence.
- **Data & privacy:** move in-memory stores to Postgres via Prisma; encrypt sensitive columns; add per-tenant/org isolation and DLP for uploads; align with regional data residency.
- **Scalability:** split branches into services (main-floor chat, rooms, games) behind an API gateway; add Redis for presence and WebSocket fan-out (or use Cloudflare Pub/Sub); run workers to aggregate `InteractionEvent` metrics.
- **AI Orchestrator (Riai):** consume `InteractionEvent` streams to recommend room pairings, surface “executive chemistry” scores, auto-schedule follow-ups, or propose game sessions that historically led to deals. Model outputs can feed `/api/lobby/insights` and trigger notifications.
