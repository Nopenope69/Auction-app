import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import * as db from '../../server/src/db';
import { getRoom, forgetRoom } from '../../server/src/roomManager';
import { DEFAULT_RULES, RoomSnapshot } from '../../server/src/types';

describe('Crash Restart, Recovery, & Persistence Integrity', () => {
  let roomId: string;
  const adminToken = 'admin_recov_123';
  const teamTokenA = 'team_a_tok';
  const teamTokenB = 'team_b_tok';

  beforeEach(() => {
    roomId = 'recov_' + Math.random().toString(36).slice(2, 8);
    db.createRoom({
      roomId,
      name: 'Recovery Test Auction',
      adminToken,
      rules: { ...DEFAULT_RULES, timerSeconds: 15 },
      teams: [
        {
          id: 'team_a',
          name: 'Team A',
          code: 'TMA',
          purse: 1000,
          originalPurse: 1000,
          rtmCards: 0,
          rosterIds: [],
          token: teamTokenA,
        },
        {
          id: 'team_b',
          name: 'Team B',
          code: 'TMB',
          purse: 1000,
          originalPurse: 1000,
          rtmCards: 0,
          rosterIds: [],
          token: teamTokenB,
        },
      ],
      players: [
        {
          id: 'p_recov_1',
          name: 'Star Player',
          role: 'All-Rounder',
          basePrice: 50,
          status: 'available',
        },
        {
          id: 'p_recov_2',
          name: 'Bowler Player',
          role: 'Bowler',
          basePrice: 20,
          status: 'available',
        },
      ],
    });
  });

  it('preserves wall-clock deadlineAt and timer state across server crash / restart', async () => {
    const room = getRoom(roomId)!;
    expect(room).not.toBeNull();

    room.setActivePlayer('p_recov_1');
    room.startTimer();

    const stateBeforeCrash = room.getFullState();
    expect(stateBeforeCrash.timerActive).toBe(true);
    expect(stateBeforeCrash.deadlineAt).toBeGreaterThan(Date.now());
    const originalDeadline = stateBeforeCrash.deadlineAt!;

    // Simulate crash: forgetRoom kills in-memory instance and interval
    forgetRoom(roomId, true);

    // Rehydrate room from SQLite
    const rehydratedRoom = getRoom(roomId)!;
    const rehydratedState = rehydratedRoom.getFullState();

    expect(rehydratedState.activePlayer?.id).toBe('p_recov_1');
    expect(rehydratedState.deadlineAt).toBe(originalDeadline);
    // After crash rehydration, timer is safely paused so it doesn't run unsupervised
    expect(rehydratedState.timerActive).toBe(false);
  });

  it('guarantees undo consistency across restart without ghost/phantom bid events', () => {
    const room = getRoom(roomId)!;
    room.setActivePlayer('p_recov_1');

    // Opening bid: 50 by Team A
    expect(room.placeBid('team_a', 50)).toBe(true);
    // Next bid: 55 by Team B
    expect(room.placeBid('team_b', 55)).toBe(true);

    const midState = room.getFullState();
    expect(midState.currentBid).toBe(55);
    expect(midState.highestBidder).toBe('team_b');

    // Admin executes UNDO
    expect(room.undo()).toBe(true);

    const undoneState = room.getFullState();
    expect(undoneState.currentBid).toBe(50);
    expect(undoneState.highestBidder).toBe('team_a');

    // Simulate sudden process crash
    forgetRoom(roomId, true);

    // Rehydrate from SQLite
    const rehydratedRoom = getRoom(roomId)!;
    const rehydratedState = rehydratedRoom.getFullState();

    expect(rehydratedState.currentBid).toBe(50);
    expect(rehydratedState.highestBidder).toBe('team_a');

    // Verify raw SQLite bid_events log has no orphan event for 55
    const events = db.getBidEvents(roomId);
    const hasGhostBid = events.some((e) => e.amount === 55 && e.teamId === 'team_b');
    expect(hasGhostBid).toBe(false);
  });

  it('performs online VACUUM INTO backup and passes SQLite integrity checks', () => {
    const room = getRoom(roomId)!;
    room.setActivePlayer('p_recov_1');
    room.placeBid('team_a', 50);
    room.markSold();

    const backupDir = path.join(__dirname, '..', '..', 'data_test_backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `backup_${roomId}.db`);

    // Perform non-blocking online backup via VACUUM INTO
    db.backupDatabase(backupFile);
    expect(fs.existsSync(backupFile)).toBe(true);

    // Open the backup file independently and run integrity checks
    const backupDb = new DatabaseSync(backupFile);
    const integrityCheck = backupDb.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    expect(integrityCheck.integrity_check).toBe('ok');

    const foreignKeyCheck = backupDb.prepare('PRAGMA foreign_key_check').all();
    expect(foreignKeyCheck.length).toBe(0);

    // Verify data completeness in the backup
    const roomRow = backupDb.prepare('SELECT id, name, status FROM rooms WHERE id = ?').get(roomId) as any;
    expect(roomRow).toBeDefined();
    expect(roomRow.id).toBe(roomId);

    const playerRow = backupDb.prepare('SELECT status, team_id, sold_price FROM players WHERE room_id = ? AND id = ?').get(roomId, 'p_recov_1') as any;
    expect(playerRow.status).toBe('sold');
    expect(playerRow.team_id).toBe('team_a');
    expect(playerRow.sold_price).toBe(50);

    backupDb.close();
    fs.unlinkSync(backupFile);
  });
});
