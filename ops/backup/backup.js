#!/usr/bin/env node
/**
 * Zero-Downtime SQLite Online Backup Script
 * Uses VACUUM INTO for non-blocking online snapshots + PRAGMA integrity_check.
 */

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);
const SOURCE_DB_PATH = path.join(DATA_DIR, 'auction.db');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runBackup() {
  console.log(`[BACKUP] Starting SQLite online backup at ${new Date().toISOString()}`);

  if (!fs.existsSync(SOURCE_DB_PATH)) {
    console.error(`[BACKUP ERROR] Source database file not found at: ${SOURCE_DB_PATH}`);
    process.exit(1);
  }

  ensureDir(BACKUP_DIR);

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupFileName = `auction_backup_${timestamp}.db`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  try {
    // 1. Open source DB and execute online VACUUM INTO
    const liveDb = new DatabaseSync(SOURCE_DB_PATH);
    liveDb.exec(`PRAGMA busy_timeout = 10000;`);
    liveDb.exec(`VACUUM INTO '${backupFilePath.replace(/'/g, "''")}';`);
    liveDb.close();

    console.log(`[BACKUP] Snapshot written to: ${backupFilePath}`);

    // 2. Validate backup artifact integrity
    const backupDb = new DatabaseSync(backupFilePath);
    const integrityRow = backupDb.prepare('PRAGMA integrity_check;').get();
    const fkRows = backupDb.prepare('PRAGMA foreign_key_check;').all();
    backupDb.close();

    if (!integrityRow || integrityRow.integrity_check !== 'ok') {
      throw new Error(`Integrity check failed: ${JSON.stringify(integrityRow)}`);
    }
    if (fkRows.length > 0) {
      throw new Error(`Foreign key check failed: ${JSON.stringify(fkRows)}`);
    }

    const stats = fs.statSync(backupFilePath);
    console.log(`[BACKUP SUCCESS] Verified integrity: ok. Size: ${(stats.size / 1024).toFixed(1)} KB`);

    // 3. Prune old backups past retention threshold
    pruneOldBackups();

    process.exit(0);
  } catch (err) {
    console.error('[BACKUP FATAL]', err);
    if (fs.existsSync(backupFilePath)) {
      try { fs.unlinkSync(backupFilePath); } catch {}
    }
    process.exit(1);
  }
}

function pruneOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.startsWith('auction_backup_') && file.endsWith('.db')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          console.log(`[BACKUP PRUNE] Removed expired backup: ${file}`);
        }
      }
    }
  } catch (err) {
    console.warn('[BACKUP PRUNE WARNING] Failed during prune check:', err.message);
  }
}

if (require.main === module) {
  runBackup();
}

module.exports = { runBackup };
