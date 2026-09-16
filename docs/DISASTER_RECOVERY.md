# Cricket Auction Platform - Disaster Recovery & Persistence Runbook

## 1. Objectives & Metrics
- **Recovery Time Objective (RTO):** < 60 seconds (Container restart or backup restore).
- **Recovery Point Objective (RPO):** < 1 second (Zero lost transactions; every auction event is synchronously committed to SQLite WAL before WebSocket broadcast).

---

## 2. Persistence Architecture
- **Engine:** Embedded SQLite via Node.js standard library (`node:sqlite: DatabaseSync`).
- **Journal Mode:** Write-Ahead Logging (`PRAGMA journal_mode = WAL`).
- **Lock Management:** `PRAGMA busy_timeout = 5000;` prevents `SQLITE_BUSY` errors during concurrent operations.
- **Write-Then-Broadcast Pattern:**
  1. In-memory mutation generated.
  2. Snapshot or event appended to SQLite in an explicit transaction (`BEGIN` ... `COMMIT`).
  3. On successful commit, state is emitted to in-memory room listeners.
  4. Broadcast dispatched to connected WebSocket clients.

---

## 3. Online Backup Playbook

### 3.1 Mechanism
Online backups are performed using SQLite's native `VACUUM INTO` command. This produces an atomic, transactionally consistent snapshot of the database without taking write locks or interrupting live auctions.

### 3.2 Automated Execution
Run the automated backup script:
```bash
node ops/backup/backup.js
```

### 3.3 Verification
The backup script automatically verifies the generated snapshot:
```sql
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```
If either check fails, the corrupted snapshot is deleted immediately, an alert is raised, and the script exits with non-zero status.

---

## 4. Disaster Recovery & Restoration Playbook

### 4.1 Automated Restore
To restore the platform to the latest known healthy backup:
```bash
node ops/restore/restore.js
```
To restore a specific timestamped snapshot:
```bash
node ops/restore/restore.js /path/to/auction_backup_2026-09-17.db
```

### 4.2 Steps Performed by Script
1. **Candidate Verification:** Runs `PRAGMA integrity_check` on the backup file.
2. **Safety Snapshot:** Creates a timestamped pre-restore copy of the current `auction.db` if present.
3. **WAL / SHM Clean:** Unlinks `auction.db-wal` and `auction.db-shm` to prevent stale WAL frame mixing.
4. **Copy & Replace:** Atomically replaces `auction.db` with the verified snapshot.
5. **Post-Restore Integrity Check:** Connects to restored database and confirms table integrity and room counts.

---

## 5. Crash Recovery Verification (Mid-Countdown Kill -9)
Automated tests in `tests/recovery/restartRecovery.test.ts` verify:
1. **Wall-Clock Countdown:** On crash, `deadlineAt` is preserved in SQLite `room_runtime`. Upon re-hydration, remaining time reflects actual wall-clock elapsed time without drift.
2. **Undo Consistency:** SQLite `bid_events` table is truncated on `UNDO_ACTION`, ensuring that re-hydrating after a crash does not generate ghost or phantom bids.
