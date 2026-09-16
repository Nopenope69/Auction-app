#!/usr/bin/env node
/**
 * Disaster Recovery & Database Restore Script
 * Validates candidate backup integrity before replacing live SQLite database.
 */

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups');
const TARGET_DB_PATH = path.join(DATA_DIR, 'auction.db');

function findLatestBackup() {
  if (!fs.existsSync(BACKUP_DIR)) return null;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('auction_backup_') && f.endsWith('.db'))
    .map((f) => ({
      name: f,
      fullPath: path.join(BACKUP_DIR, f),
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? files[0].fullPath : null;
}

function runRestore(candidateArg) {
  const candidatePath = candidateArg || findLatestBackup();
  console.log(`[RESTORE] Initiating database restore procedure`);

  if (!candidatePath || !fs.existsSync(candidatePath)) {
    console.error(`[RESTORE ERROR] No valid backup artifact found at: ${candidatePath}`);
    process.exit(1);
  }

  console.log(`[RESTORE] Validating candidate backup: ${candidatePath}`);

  try {
    // 1. Pre-restore candidate validation
    const candidateDb = new DatabaseSync(candidatePath);
    const integrityRow = candidateDb.prepare('PRAGMA integrity_check;').get();
    const fkRows = candidateDb.prepare('PRAGMA foreign_key_check;').all();

    // Verify schema table presence
    const requiredTables = ['rooms', 'teams', 'players', 'room_runtime'];
    for (const table of requiredTables) {
      const exists = candidateDb.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?;"
      ).get(table);
      if (!exists) {
        throw new Error(`Candidate database is missing required table: ${table}`);
      }
    }
    candidateDb.close();

    if (!integrityRow || integrityRow.integrity_check !== 'ok') {
      throw new Error(`Integrity check failed: ${JSON.stringify(integrityRow)}`);
    }
    if (fkRows.length > 0) {
      throw new Error(`Foreign key check failed: ${JSON.stringify(fkRows)}`);
    }

    console.log(`[RESTORE] Candidate integrity verified: OK`);

    // 2. Safety snapshot of current target DB if it exists
    if (fs.existsSync(TARGET_DB_PATH)) {
      const safetyBackup = path.join(DATA_DIR, `auction.db.pre_restore_${Date.now()}.bak`);
      fs.copyFileSync(TARGET_DB_PATH, safetyBackup);
      console.log(`[RESTORE] Created pre-restore safety copy at: ${safetyBackup}`);
    }

    // 3. Remove existing WAL & SHM files to prevent state collision
    const walFile = `${TARGET_DB_PATH}-wal`;
    const shmFile = `${TARGET_DB_PATH}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    // 4. Overwrite target DB with verified candidate
    fs.copyFileSync(candidatePath, TARGET_DB_PATH);
    console.log(`[RESTORE] Copied candidate file to: ${TARGET_DB_PATH}`);

    // 5. Post-restore verification on target DB
    const restoredDb = new DatabaseSync(TARGET_DB_PATH);
    const finalIntegrity = restoredDb.prepare('PRAGMA integrity_check;').get();
    const roomsCount = restoredDb.prepare('SELECT COUNT(*) AS count FROM rooms;').get();
    restoredDb.close();

    if (!finalIntegrity || finalIntegrity.integrity_check !== 'ok') {
      throw new Error(`Target database post-restore check failed: ${JSON.stringify(finalIntegrity)}`);
    }

    console.log(`[RESTORE SUCCESS] Target database operational. Rooms restored: ${roomsCount.count}`);
    process.exit(0);
  } catch (err) {
    console.error('[RESTORE FATAL] Restore failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runRestore(process.argv[2]);
}

module.exports = { runRestore };
