# Cricket Auction Platform - Data Protection & Compliance Dossier (DPDP Rules 2025)

## 1. Statutory Context & Principles
This document outlines the privacy and data governance framework for the Cricket Auction Platform in compliance with the **Digital Personal Data Protection Act, 2023 (DPDP Act)** and the **DPDP Rules, 2025** (Government of India).

The platform operates as a **Data Fiduciary** for personal data ingested during cricket auctions (player names, profile photos, statistics, mobile identifiers, and tournament affiliations).

---

## 2. Data Lifecycle & Purpose Limitation

| Category | Personal Data Elements | Purpose | Retention Period |
| :--- | :--- | :--- | :--- |
| **Players** | Full Name, Photo URL, Cricket Statistics, Previous Team | Player profiling, auction display, bidding execution | Duration of tournament + 30 days |
| **Franchise Bidders** | Team Representative Token, Assigned Team Name | Authentication, bid attribution, purse management | Duration of tournament |
| **Organizers** | Admin Secret Token, Contact Email | Room creation, auction administration | Duration of tournament |
| **Audit Logs** | Bid timestamp, team identifier, amount | Integrity verification, dispute resolution | 90 days post-tournament |

---

## 3. Data Subject Rights & Operational Enforcement

### 3.1 Right to Erasure / Right to be Forgotten (F-001)
Under Section 12 of the DPDP Act, players and organizers may request complete erasure of their personal data upon tournament completion.

**Implementation Endpoint:**
`DELETE /api/auctions/:roomId`
- **Authentication:** Requires `x-admin-token` header matching the room's secret.
- **Cascade Purge Sequence:**
  1. Room instance evicted from memory cache (`forgetRoom(roomId, true)`).
  2. Active WebSocket connections closed with code 4004.
  3. Relational deletion in SQLite:
     ```sql
     DELETE FROM players WHERE room_id = ?;
     DELETE FROM teams WHERE room_id = ?;
     DELETE FROM bid_events WHERE room_id = ?;
     DELETE FROM room_runtime WHERE room_id = ?;
     DELETE FROM rooms WHERE id = ?;
     ```
  4. Instant removal of all associated biometric/photo references and statistics.

### 3.2 Notice & Consent Architecture
- **Pre-Auction Upload Notice:** When admins upload player CSV or trigger CricHeroes sync, notice is rendered detailing that player profiles and performance statistics are processed solely for conducting the live auction.
- **Spectator Transparency:** Public WebSocket feeds only transmit auction identifiers and player performance metrics. Capability tokens and admin secrets are strictly stripped.

---

## 4. Security Safeguards (Section 8)
1. **Access Boundaries:** Strict capability-based routing ensures spectator feeds cannot write or modify player details.
2. **Backups:** Operational snapshots are encrypted in transit and at rest with automated pruning past retention window (7 days).
3. **Data Localization:** SQLite database files reside entirely on the local host/volume, maintaining sovereign data compliance within the specified deployment region.
