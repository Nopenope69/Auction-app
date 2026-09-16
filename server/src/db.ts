// Persistence layer. This is the single most important architectural change
// versus the original prototype: every state transition is written here
// BEFORE it is broadcast to clients, so an auction survives a server
// restart, a crash, or a dropped connection instead of vanishing.
//
// Uses Node's built-in node:sqlite (no native module install/compile step,
// which matters for a solo founder shipping quickly). The repository
// functions below are the only place that knows about SQLite - swapping to
// Postgres later (as the architecture doc recommends once you have
// concurrent multi-instance load) means rewriting this file only.

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import {
  AuctionRules,
  BidLogEntry,
  CricheroesSyncStatus,
  DEFAULT_RULES,
  Player,
  RoomSnapshot,
  RoomStatus,
  RtmState,
  Team,
} from './types';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'auction.db');

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA busy_timeout = 5000;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    admin_token TEXT NOT NULL,
    status TEXT NOT NULL,
    rules_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teams (
    room_id TEXT NOT NULL,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    purse REAL NOT NULL,
    original_purse REAL NOT NULL,
    rtm_cards INTEGER NOT NULL,
    token TEXT NOT NULL,
    PRIMARY KEY (room_id, id)
  );

  CREATE TABLE IF NOT EXISTS players (
    room_id TEXT NOT NULL,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    base_price REAL NOT NULL,
    photo_url TEXT,
    previous_team_code TEXT,
    status TEXT NOT NULL,
    sold_price REAL,
    team_id TEXT,
    runs REAL, wickets REAL, average REAL, strike_rate REAL, economy REAL, matches REAL,
    cricheroes_url TEXT,
    cricheroes_photo_url TEXT,
    cricheroes_stats_json TEXT,
    cricheroes_status TEXT NOT NULL DEFAULT 'none',
    cricheroes_synced_at INTEGER,
    cricheroes_error TEXT,
    PRIMARY KEY (room_id, id)
  );

  CREATE TABLE IF NOT EXISTS bid_events (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    amount REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_bid_events_room ON bid_events(room_id, timestamp);

  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS room_runtime (
    room_id TEXT PRIMARY KEY,
    active_player_id TEXT,
    current_bid REAL NOT NULL,
    current_bidder_id TEXT,
    timer INTEGER NOT NULL,
    timer_active INTEGER NOT NULL,
    deadline_at INTEGER,
    rtm_state_json TEXT,
    undo_stack_json TEXT
  );
`);

// Safe column migrations if database already existed
try { db.exec(`ALTER TABLE room_runtime ADD COLUMN deadline_at INTEGER;`); } catch {}
try { db.exec(`ALTER TABLE room_runtime ADD COLUMN undo_stack_json TEXT;`); } catch {}


function nowMs() {
  return Date.now();
}

export function createRoom(input: {
  roomId: string;
  name: string;
  adminToken: string;
  rules: AuctionRules;
  teams: Team[];
  players: Player[];
}) {
  const insertRoom = db.prepare(
    `INSERT INTO rooms (id, name, admin_token, status, rules_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertTeam = db.prepare(
    `INSERT INTO teams (room_id, id, name, code, purse, original_purse, rtm_cards, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertPlayer = db.prepare(
    `INSERT INTO players (room_id, id, name, role, base_price, photo_url, previous_team_code, status, sold_price, team_id, runs, wickets, average, strike_rate, economy, matches, cricheroes_url, cricheroes_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertRuntime = db.prepare(
    `INSERT INTO room_runtime (room_id, active_player_id, current_bid, current_bidder_id, timer, timer_active, rtm_state_json) VALUES (?, NULL, 0, NULL, ?, 0, NULL)`
  );

  db.exec('BEGIN');
  try {
    insertRoom.run(input.roomId, input.name, input.adminToken, 'setup', JSON.stringify(input.rules), nowMs());
    for (const t of input.teams) {
      insertTeam.run(input.roomId, t.id, t.name, t.code, t.purse, t.originalPurse, t.rtmCards, t.token);
    }
    for (const p of input.players) {
      insertPlayer.run(
        input.roomId, p.id, p.name, p.role, p.basePrice, p.photoUrl || null, p.previousTeamCode || null,
        p.status, p.soldPrice ?? null, p.teamId ?? null,
        p.runs ?? null, p.wickets ?? null, p.average ?? null, p.strikeRate ?? null, p.economy ?? null, p.matches ?? null,
        p.cricheroesUrl || null, p.cricheroesUrl ? 'pending' : 'none'
      );
    }
    insertRuntime.run(input.roomId, input.rules.timerSeconds);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function addPlayers(roomId: string, players: Player[]) {
  const insertPlayer = db.prepare(
    `INSERT INTO players (room_id, id, name, role, base_price, photo_url, previous_team_code, status, sold_price, team_id, runs, wickets, average, strike_rate, economy, matches, cricheroes_url, cricheroes_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(room_id, id) DO UPDATE SET
       name=excluded.name, role=excluded.role, base_price=excluded.base_price, photo_url=excluded.photo_url,
       previous_team_code=excluded.previous_team_code, cricheroes_url=excluded.cricheroes_url`
  );
  db.exec('BEGIN');
  try {
    for (const p of players) {
      insertPlayer.run(
        roomId, p.id, p.name, p.role, p.basePrice, p.photoUrl || null, p.previousTeamCode || null,
        p.status, p.soldPrice ?? null, p.teamId ?? null,
        p.runs ?? null, p.wickets ?? null, p.average ?? null, p.strikeRate ?? null, p.economy ?? null, p.matches ?? null,
        p.cricheroesUrl || null, p.cricheroesUrl ? 'pending' : 'none'
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Applied after a scrape attempt (success or failure) - deliberately
// separate from persistSnapshot, since this is not part of the live
// auction state machine and must never block or race with a bid/timer
// mutation.
export function updateCricheroesCache(
  roomId: string,
  playerId: string,
  data: { status: CricheroesSyncStatus; photoUrl?: string; stats?: Record<string, string>; error?: string }
) {
  db.prepare(
    `UPDATE players SET cricheroes_status=?, cricheroes_photo_url=?, cricheroes_stats_json=?, cricheroes_synced_at=?, cricheroes_error=?
     WHERE room_id=? AND id=?`
  ).run(
    data.status,
    data.photoUrl || null,
    data.stats ? JSON.stringify(data.stats) : null,
    nowMs(),
    data.error || null,
    roomId,
    playerId
  );
}

export function setCricheroesUrl(roomId: string, playerId: string, url: string) {
  db.prepare(`UPDATE players SET cricheroes_url=?, cricheroes_status='pending' WHERE room_id=? AND id=?`).run(
    url,
    roomId,
    playerId
  );
}

export function roomExists(roomId: string): boolean {
  const row = db.prepare(`SELECT id FROM rooms WHERE id = ?`).get(roomId);
  return !!row;
}

export function loadRoom(roomId: string): RoomSnapshot | null {
  const room = db.prepare(`SELECT * FROM rooms WHERE id = ?`).get(roomId) as any;
  if (!room) return null;

  const teamRows = db.prepare(`SELECT * FROM teams WHERE room_id = ?`).all(roomId) as any[];
  const playerRows = db.prepare(`SELECT * FROM players WHERE room_id = ?`).all(roomId) as any[];
  const runtime = db.prepare(`SELECT * FROM room_runtime WHERE room_id = ?`).get(roomId) as any;
  const bidRows = db.prepare(`SELECT * FROM bid_events WHERE room_id = ? ORDER BY timestamp ASC`).all(roomId) as any[];

  const players: Player[] = playerRows.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    basePrice: p.base_price,
    photoUrl: p.photo_url || undefined,
    previousTeamCode: p.previous_team_code || undefined,
    status: p.status,
    soldPrice: p.sold_price ?? undefined,
    teamId: p.team_id ?? undefined,
    runs: p.runs ?? undefined,
    wickets: p.wickets ?? undefined,
    average: p.average ?? undefined,
    strikeRate: p.strike_rate ?? undefined,
    economy: p.economy ?? undefined,
    matches: p.matches ?? undefined,
    cricheroesUrl: p.cricheroes_url || undefined,
    cricheroesPhotoUrl: p.cricheroes_photo_url || undefined,
    cricheroesStats: p.cricheroes_stats_json ? JSON.parse(p.cricheroes_stats_json) : undefined,
    cricheroesStatus: (p.cricheroes_status || 'none') as CricheroesSyncStatus,
    cricheroesSyncedAt: p.cricheroes_synced_at ?? undefined,
    cricheroesError: p.cricheroes_error || undefined,
  }));

  const teams: Team[] = teamRows.map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    purse: t.purse,
    originalPurse: t.original_purse,
    rtmCards: t.rtm_cards,
    token: t.token,
    rosterIds: players.filter((p) => p.teamId === t.id).map((p) => p.id),
  }));

  const biddingLog: BidLogEntry[] = bidRows.map((b) => ({
    id: b.id,
    playerId: b.player_id,
    playerName: b.player_name,
    teamId: b.team_id,
    teamName: b.team_name,
    amount: b.amount,
    timestamp: b.timestamp,
    type: b.type,
  }));

  return {
    roomId: room.id,
    name: room.name,
    status: room.status as RoomStatus,
    rules: JSON.parse(room.rules_json) as AuctionRules,
    adminToken: room.admin_token,
    teams,
    players,
    runtime: {
      activePlayerId: runtime?.active_player_id ?? null,
      currentBid: runtime?.current_bid ?? 0,
      currentBidderId: runtime?.current_bidder_id ?? null,
      timer: runtime?.timer ?? DEFAULT_RULES.timerSeconds,
      timerActive: !!runtime?.timer_active,
      deadlineAt: runtime?.deadline_at ?? null,
      rtmState: runtime?.rtm_state_json ? (JSON.parse(runtime.rtm_state_json) as RtmState) : null,
      undoStack: runtime?.undo_stack_json ? JSON.parse(runtime.undo_stack_json) : [],
    },
    biddingLog,
  };
}

// Persist a full snapshot of mutable state. Called after every mutation,
// before broadcasting to clients (write-then-broadcast).
export function persistSnapshot(
  roomId: string,
  data: {
    status: RoomStatus;
    players: Player[];
    teams: Team[];
    activePlayerId: string | null;
    currentBid: number;
    currentBidderId: string | null;
    timer: number;
    timerActive: boolean;
    deadlineAt?: number | null;
    rtmState: RtmState | null;
    undoStack?: string[];
  }
) {
  const updatePlayer = db.prepare(
    `UPDATE players SET status=?, sold_price=?, team_id=? WHERE room_id=? AND id=?`
  );
  const updateTeam = db.prepare(`UPDATE teams SET purse=?, rtm_cards=? WHERE room_id=? AND id=?`);
  const updateRoomStatus = db.prepare(`UPDATE rooms SET status=? WHERE id=?`);
  const upsertRuntime = db.prepare(`
    INSERT INTO room_runtime (room_id, active_player_id, current_bid, current_bidder_id, timer, timer_active, deadline_at, rtm_state_json, undo_stack_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_id) DO UPDATE SET
      active_player_id=excluded.active_player_id, current_bid=excluded.current_bid,
      current_bidder_id=excluded.current_bidder_id, timer=excluded.timer,
      timer_active=excluded.timer_active, deadline_at=excluded.deadline_at,
      rtm_state_json=excluded.rtm_state_json, undo_stack_json=excluded.undo_stack_json
  `);

  db.exec('BEGIN');
  try {
    for (const p of data.players) {
      updatePlayer.run(p.status, p.soldPrice ?? null, p.teamId ?? null, roomId, p.id);
    }
    for (const t of data.teams) {
      updateTeam.run(t.purse, t.rtmCards, roomId, t.id);
    }
    updateRoomStatus.run(data.status, roomId);
    upsertRuntime.run(
      roomId,
      data.activePlayerId,
      data.currentBid,
      data.currentBidderId,
      data.timer,
      data.timerActive ? 1 : 0,
      data.deadlineAt ?? null,
      data.rtmState ? JSON.stringify(data.rtmState) : null,
      data.undoStack ? JSON.stringify(data.undoStack) : null
    );
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Fast single-row delta update for 1-second countdown ticks (avoids rewriting all player/team rows)
export function updateRoomTimer(roomId: string, timer: number, deadlineAt: number | null = null) {
  db.prepare(
    `UPDATE room_runtime SET timer = ?, deadline_at = ? WHERE room_id = ?`
  ).run(timer, deadlineAt, roomId);
}

// Synchronize bid_events with undo snapshot
export function revertBidEventsToSnapshot(roomId: string, validEventIds: string[]) {
  if (validEventIds.length === 0) {
    db.prepare(`DELETE FROM bid_events WHERE room_id = ?`).run(roomId);
  } else {
    const placeholders = validEventIds.map(() => '?').join(',');
    db.prepare(
      `DELETE FROM bid_events WHERE room_id = ? AND id NOT IN (${placeholders})`
    ).run(roomId, ...validEventIds);
  }
}

export function getBidEvents(roomId: string): BidLogEntry[] {
  const rows = db.prepare(`SELECT * FROM bid_events WHERE room_id = ? ORDER BY timestamp ASC`).all(roomId) as any[];
  return rows.map((r) => ({
    id: r.id,
    playerId: r.player_id,
    playerName: r.player_name,
    teamId: r.team_id,
    teamName: r.team_name,
    amount: r.amount,
    timestamp: r.timestamp,
    type: r.type,
  }));
}

export function appendBidEvent(roomId: string, entry: BidLogEntry) {
  const safeAmount = Number(entry.amount);
  if (isNaN(safeAmount) || !isFinite(safeAmount)) {
    throw new TypeError(`Invalid bid amount for SQLite insertion: ${entry.amount}`);
  }
  db.prepare(
    `INSERT INTO bid_events (id, room_id, player_id, player_name, team_id, team_name, amount, timestamp, type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, roomId, entry.playerId, entry.playerName, entry.teamId, entry.teamName, safeAmount, entry.timestamp, entry.type);
}

export function resetRoom(roomId: string) {
  const roomRow = db.prepare(`SELECT rules_json FROM rooms WHERE id = ?`).get(roomId) as any;
  const rules: AuctionRules = roomRow ? JSON.parse(roomRow.rules_json) : DEFAULT_RULES;
  const initialRtmCards = rules.rtmEnabled ? 3 : 0;

  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE players SET status='available', sold_price=NULL, team_id=NULL WHERE room_id=?`).run(roomId);
    db.prepare(`SELECT id, original_purse FROM teams WHERE room_id=?`)
      .all(roomId)
      .forEach((t: any) => {
        db.prepare(`UPDATE teams SET purse=?, rtm_cards=? WHERE room_id=? AND id=?`).run(t.original_purse, initialRtmCards, roomId, t.id);
      });
    db.prepare(`DELETE FROM bid_events WHERE room_id=?`).run(roomId);
    db.prepare(
      `UPDATE room_runtime SET active_player_id=NULL, current_bid=0, current_bidder_id=NULL, timer_active=0, deadline_at=NULL, rtm_state_json=NULL, undo_stack_json=NULL WHERE room_id=?`
    ).run(roomId);
    db.prepare(`UPDATE rooms SET status='setup' WHERE id=?`).run(roomId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// SQLite Online Backup API / VACUUM INTO for clean, non-locking backup artifacts
export function backupDatabase(targetPath: string) {
  db.exec(`VACUUM INTO '${targetPath.replace(/'/g, "''")}';`);
}

// Admin CRUD Operations
export function addManualPlayer(roomId: string, player: Player) {
  db.prepare(`
    INSERT INTO players (room_id, id, name, role, base_price, photo_url, previous_team_code, status, sold_price, team_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    roomId,
    player.id,
    player.name,
    player.role,
    player.basePrice,
    player.photoUrl ?? null,
    player.previousTeamCode ?? null,
    player.status,
    player.soldPrice ?? null,
    player.teamId ?? null
  );
}

export function updatePlayerRecord(roomId: string, playerId: string, updates: Partial<Player>) {
  const current = db.prepare(`SELECT * FROM players WHERE room_id = ? AND id = ?`).get(roomId, playerId) as any;
  if (!current) return false;

  const name = updates.name !== undefined ? updates.name : current.name;
  const role = updates.role !== undefined ? updates.role : current.role;
  const basePrice = updates.basePrice !== undefined ? updates.basePrice : current.base_price;
  const photoUrl = updates.photoUrl !== undefined ? updates.photoUrl : current.photo_url;
  const previousTeamCode = updates.previousTeamCode !== undefined ? updates.previousTeamCode : current.previous_team_code;

  db.prepare(`
    UPDATE players SET name=?, role=?, base_price=?, photo_url=?, previous_team_code=?
    WHERE room_id=? AND id=?
  `).run(name, role, basePrice, photoUrl, previousTeamCode, roomId, playerId);
  return true;
}

export function deletePlayerRecord(roomId: string, playerId: string): boolean {
  const player = db.prepare(`SELECT status FROM players WHERE room_id = ? AND id = ?`).get(roomId, playerId) as any;
  if (!player || player.status !== 'available') return false;
  db.prepare(`DELETE FROM players WHERE room_id = ? AND id = ?`).run(roomId, playerId);
  return true;
}

export function updateTeamRecord(roomId: string, teamId: string, updates: { name?: string; purse?: number }) {
  const current = db.prepare(`SELECT * FROM teams WHERE room_id = ? AND id = ?`).get(roomId, teamId) as any;
  if (!current) return false;

  const name = updates.name !== undefined ? updates.name : current.name;
  const purse = updates.purse !== undefined ? updates.purse : current.purse;

  db.prepare(`UPDATE teams SET name=?, purse=? WHERE room_id=? AND id=?`).run(name, purse, roomId, teamId);
  return true;
}

export function listTeamLinks(roomId: string): Team[] {
  const rows = db.prepare(`SELECT * FROM teams WHERE room_id = ?`).all(roomId) as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    purse: r.purse,
    originalPurse: r.original_purse,
    rtmCards: r.rtm_cards,
    token: r.token,
    rosterIds: [],
  }));
}

export function deleteRoom(roomId: string) {
  db.exec('BEGIN');
  try {
    db.prepare(`DELETE FROM rooms WHERE id = ?`).run(roomId);
    db.prepare(`DELETE FROM teams WHERE room_id = ?`).run(roomId);
    db.prepare(`DELETE FROM players WHERE room_id = ?`).run(roomId);
    db.prepare(`DELETE FROM bid_events WHERE room_id = ?`).run(roomId);
    db.prepare(`DELETE FROM room_runtime WHERE room_id = ?`).run(roomId);
    db.exec('COMMIT');
    return true;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}


export function findTeamByToken(roomId: string, token: string): Team | null {
  const row = db.prepare(`SELECT * FROM teams WHERE room_id = ? AND token = ?`).get(roomId, token) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    purse: row.purse,
    originalPurse: row.original_purse,
    rtmCards: row.rtm_cards,
    token: row.token,
    rosterIds: [],
  };
}

export function isAdminToken(roomId: string, token: string): boolean {
  const row = db.prepare(`SELECT admin_token FROM rooms WHERE id = ?`).get(roomId) as any;
  return !!row && row.admin_token === token;
}

export function publicRoomInfo(roomId: string): { name: string; teams: { id: string; name: string; code: string }[] } | null {
  const room = db.prepare(`SELECT name FROM rooms WHERE id = ?`).get(roomId) as any;
  if (!room) return null;
  const teams = db.prepare(`SELECT id, name, code FROM teams WHERE room_id = ?`).all(roomId) as any[];
  return { name: room.name, teams };
}
