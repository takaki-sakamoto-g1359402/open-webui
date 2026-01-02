# UGW FounderWorld / DealOS PoC Demo Script

## Setup
1. `docker compose -f ugw_poc/docker-compose.yml up --build`
2. Use the headers: `X-Actor-Id`, `X-Role`, `X-Request-Id` for every request.

## 1) Create PoP + VC identities
- Create admin user:
  - `POST /api/identity/users` with body `{ "id": "admin-1", "name": "Admin", "role": "admin" }`
- Create participant:
  - `POST /api/identity/users` with body `{ "id": "founder-1", "name": "Founder", "role": "participant" }`
- Verify PoP:
  - `POST /api/identity/founder-1/pop` with `{ "method": "mock", "proof": {"commitment": "abc"} }`
- Issue VC:
  - `POST /api/identity/founder-1/vc/issue` with `{ "expires_at": "2030-01-01T00:00:00Z" }`

## 2) Revalidate and revoke credential
- `POST /api/registry/update` with `{ "user_id": "founder-1", "vc_status": "valid", "expires_at": "2030-01-01T00:00:00Z", "revoked": false }`
- `POST /api/identity/revalidate` with `{ "user_id": "founder-1" }`
- Revoke:
  - `POST /api/identity/founder-1/vc/revoke` with `{ "reason": "offboarding" }`

## 3) Create room + invite + accept
- `POST /api/rooms` with `{ "id": "room-1", "name": "Research", "participants": ["founder-1"] }`
- `POST /api/rooms/room-1/invite` with `{ "invitee_id": "investor-1" }`
- `POST /api/invites/<invite_id>/respond` with `{ "status": "accepted" }`

## 4) Add artifacts and edits
- `POST /api/rooms/room-1/artifacts` with `{ "artifact_id": "pitch-1", "name": "Pitch", "classification": "CONFIDENTIAL", "content": "initial" }`
- `PUT /api/artifacts/pitch-1` with `{ "content": "updated" }`

## 5) Audit explorer (allowed + denied)
- `GET /api/audit/events`
- Attempt a denied action (e.g., export confidential as participant) to see a denied audit entry.

## 6) Export evidence bundle
- `POST /api/rooms/room-1/export` with `{ "room_id": "room-1", "include_confidential": false }`

## 7) Verify audit log and replay
- `POST /api/audit/verify`
- `POST /api/replay`

## 8) Rotate keys and verify historical checkpoints
- `POST /api/audit/rotate-key`
- `POST /api/audit/verify`
