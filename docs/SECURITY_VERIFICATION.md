# Cricket Auction Platform - Security Verification & Evidence Dossier

## 1. Executive Summary
This document provides empirical verification and architecture controls covering the OWASP WebSocket Security standard, RFC 6455 handshake guarantees, input fuzzing defense, and role-based access control.

---

## 2. Threat Model & Controls

### 2.1 RFC 6455 Handshake & Origin Validation
- **Risk:** Cross-Site WebSocket Hijacking (CSWSH) allowing unauthorized web applications to issue bids on behalf of an authenticated operator.
- **Control:** Handshake checks `request.headers.origin` against `CORS_ALLOWED_ORIGINS`.
- **Implementation:** `server/src/index.ts:431-452`. Requests with disallowed or missing browser origins are rejected with `HTTP 403 Forbidden` before WebSocket upgrade.

### 2.2 Zod-Guarded Message Parsing & Injection Defense
- **Risk (Colleague Audit S1 & S2):** Malformed inputs such as non-numeric objects `{ amount: {} }` or string amounts `{ amount: "70" }` caused uncaught type exceptions, unhandled rejections, or string concatenation arithmetic (`"50" + 5 = "505"`).
- **Control:** Strict schema validation using `zod` (`ClientMessageSchema`).
- **Implementation:**
  - `PlaceBidSchema`: `amount: z.number().positive().finite().optional()`
  - Every incoming payload is validated prior to domain dispatch.
  - Failures emit `{ type: 'ERROR', message: 'Invalid message payload: ...' }` without throwing.

### 2.3 Rate Limiting & Denial of Service (DoS)
- **Risk:** Rapid WebSocket frame flooding exhausting server event loop or crashing SQLite write queues.
- **Control:**
  - Maximum WebSocket payload enforced at `maxPayload: 4096` bytes.
  - Sliding token bucket rate limit: maximum 30 messages per 3 seconds per connection.
  - Sub-limit for reactions: maximum 6 emojis per 3 seconds per connection.
- **Implementation:** `server/src/index.ts:472-495`.

### 2.4 Capability-Based Role Authorization
- Roles are strictly partitioned:
  - **Admin:** Possesses 16-byte base64url random token. Only admin can start/pause timer, mark sold/unsold, execute undo, or end auction.
  - **Team:** Possesses 10-byte team token. Can only place bids for their own allocated team ID. Cannot manipulate timer or player states.
  - **Spectator:** Read-only access. Any attempt to send administrative or bidding messages returns an immediate `Unauthorized` error.

---

## 3. Empirical Test Evidence

All automated security tests are codified in `tests/protocol/protocolSecurity.test.ts` and executed continuously in CI:

```bash
✓ WebSocket Protocol Security & Hardening > rejects connection with invalid admin token (code 4001)
✓ WebSocket Protocol Security & Hardening > rejects connection with nonexistent room (code 4004)
✓ WebSocket Protocol Security & Hardening > handles malformed JSON without crashing the server
✓ WebSocket Protocol Security & Hardening > rejects PLACE_BID with non-numeric object amount without crashing (Critical S1 fix)
✓ WebSocket Protocol Security & Hardening > rejects string amounts (S2 fix: prevents string concatenation)
✓ WebSocket Protocol Security & Hardening > enforces message authorization: spectator cannot execute admin actions
✓ WebSocket Protocol Security & Hardening > enforces rate limiting when connection is flooded with messages
```

### Dependency Audit
```bash
$ npm audit --omit=dev
found 0 vulnerabilities
```
Production runtime dependencies are audited and clean.
