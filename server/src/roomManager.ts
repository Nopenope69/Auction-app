// Keeps at most one live AuctionRoom instance per room in memory, hydrated
// from SQLite on first access. Multiple concurrent auction rooms is the
// multi-tenancy requirement from the architecture doc - each club's
// tournament is an isolated room, keyed by a random slug, with no
// cross-room data access by construction (every query is scoped by roomId).

import { AuctionRoom } from './auctionRoom';
import * as db from './db';

const liveRooms = new Map<string, AuctionRoom>();

export function getRoom(roomId: string): AuctionRoom | null {
  const cached = liveRooms.get(roomId);
  if (cached) return cached;

  const snapshot = db.loadRoom(roomId);
  if (!snapshot) return null;

  const room = new AuctionRoom(snapshot);
  liveRooms.set(roomId, room);
  return room;
}

export function forgetRoom(roomId: string, force = false) {
  const room = liveRooms.get(roomId);
  if (!room) return;
  if (!force && room.isTimerActive()) {
    room.pauseTimer();
  }
  room.destroy();
  liveRooms.delete(roomId);
}

// Returns an already-instantiated room WITHOUT hydrating one from disk if
// it isn't loaded. Used by background jobs (e.g. CricHeroes sync) that
// should update a live room if someone's connected, but must never
// themselves cause a room to be loaded into memory and left there with no
// WebSocket connection to eventually trigger cleanup.
export function peekRoom(roomId: string): AuctionRoom | null {
  return liveRooms.get(roomId) || null;
}
