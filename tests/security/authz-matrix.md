# Cricket Auction Platform - Authorization Matrix

| Action / Endpoint | Role: Spectator | Role: Team Bidder | Role: Room Admin | Enforcement Layer | Test Verification File |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **WebSocket: PLACE_BID** | ❌ 403 / ERROR | ✅ Allowed (Own Team Only) | ❌ Disallowed (Admin cannot bid) | `server/src/index.ts:590` | `tests/protocol/protocolSecurity.test.ts` |
| **WebSocket: SET_ACTIVE_PLAYER** | ❌ 403 / ERROR | ❌ 403 / ERROR | ✅ Allowed | `server/src/index.ts:600` | `tests/protocol/protocolSecurity.test.ts` |
| **WebSocket: START_TIMER** | ❌ 403 / ERROR | ❌ 403 / ERROR | ✅ Allowed | `server/src/index.ts:606` | `tests/protocol/protocolSecurity.test.ts` |
| **WebSocket: PAUSE_TIMER** | ❌ 403 / ERROR | ❌ 403 / ERROR | ✅ Allowed | `server/src/index.ts:612` | `tests/protocol/protocolSecurity.test.ts` |
| **WebSocket: MARK_SOLD** | ❌ 403 / ERROR | ❌ 403 / ERROR | ✅ Allowed | `server/src/index.ts:618` | `tests/protocol/protocolSecurity.test.ts` |
| **WebSocket: MARK_UNSOLD** | ❌ 403 / ERROR | ❌ 403 / ERROR | ✅ Allowed | `server/src/index.ts:624` | `tests/protocol/protocolSecurity.test.ts` |
| **WebSocket: EXERCISE_RTM** | ❌ 403 / ERROR | ❌ 403 / ERROR | ✅ Allowed | `server/src/index.ts:630` | `tests/protocol/protocolSecurity.test.ts` |
| **WebSocket: UNDO_ACTION** | ❌ 403 / ERROR | ❌ 403 / ERROR | ✅ Allowed | `server/src/index.ts:646` | `tests/protocol/protocolSecurity.test.ts` |
| **WebSocket: RESET** | ❌ 403 / ERROR | ❌ 403 / ERROR | ✅ Allowed | `server/src/index.ts:652` | `tests/protocol/protocolSecurity.test.ts` |
| **WebSocket: END_AUCTION** | ❌ 403 / ERROR | ❌ 403 / ERROR | ✅ Allowed | `server/src/index.ts:657` | `tests/protocol/protocolSecurity.test.ts` |
| **WebSocket: REACTION** | ✅ Allowed (Rate limited: 6/3s) | ✅ Allowed (Rate limited) | ✅ Allowed | `server/src/index.ts:665` | `tests/protocol/protocolSecurity.test.ts` |
| **REST: POST /api/auctions** | ✅ Public (Creates room) | ✅ Public | ✅ Public | `server/src/index.ts:114` | Smoke / Vitest suite |
| **REST: GET /api/auctions/:id/info** | ✅ Public Read-Only | ✅ Public Read-Only | ✅ Public Read-Only | `server/src/index.ts:191` | Smoke / Vitest suite |
| **REST: GET /api/auctions/:id/team-links** | ❌ 401 Unauthorized | ❌ 401 Unauthorized | ✅ `x-admin-token` required | `server/src/index.ts:198` | Vitest / Unit suite |
| **REST: POST /api/auctions/:id/players** | ❌ 401 Unauthorized | ❌ 401 Unauthorized | ✅ `x-admin-token` required | `server/src/index.ts:208` | Smoke / Vitest suite |
| **REST: POST /api/auctions/:id/players/manual**| ❌ 401 Unauthorized | ❌ 401 Unauthorized | ✅ `x-admin-token` required | `server/src/index.ts:253` | Vitest / Unit suite |
| **REST: PATCH /api/auctions/:id/players/:pid** | ❌ 401 Unauthorized | ❌ 401 Unauthorized | ✅ `x-admin-token` required | `server/src/index.ts:285` | Vitest / Unit suite |
| **REST: DELETE /api/auctions/:id/players/:pid**| ❌ 401 Unauthorized | ❌ 401 Unauthorized | ✅ `x-admin-token` required | `server/src/index.ts:303` | Vitest / Unit suite |
| **REST: PATCH /api/auctions/:id/teams/:tid** | ❌ 401 Unauthorized | ❌ 401 Unauthorized | ✅ `x-admin-token` required | `server/src/index.ts:321` | Vitest / Unit suite |
| **REST: POST /api/auctions/:id/end** | ❌ 401 Unauthorized | ❌ 401 Unauthorized | ✅ `x-admin-token` required | `server/src/index.ts:340` | Vitest / Unit suite |
| **REST: DELETE /api/auctions/:id (DPDP)** | ❌ 401 Unauthorized | ❌ 401 Unauthorized | ✅ `x-admin-token` required | `server/src/index.ts:357` | Vitest / Unit suite |
| **REST: /livez, /readyz, /api/version** | ✅ Public Probes | ✅ Public Probes | ✅ Public Probes | `server/src/index.ts:90-110` | Vitest / Protocol suite |
