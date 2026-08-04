// Orchestrates a single player's CricHeroes sync: scrape -> persist ->
// (if the room is currently live in memory) update it and notify
// connected clients. Used by both the explicit admin-triggered endpoint
// and the fire-and-forget auto-sync that runs after a CSV import.
//
// Deliberately never called from the auction state machine (auctionRoom.ts)
// itself - a scrape failure or slow response here must never touch the
// bidding path.

import * as db from './db';
import { scrapePlayerProfile } from './cricheroesScraper';
import { peekRoom } from './roomManager';

export async function syncPlayerCricheroes(roomId: string, playerId: string, url: string): Promise<void> {
  db.updateCricheroesCache(roomId, playerId, { status: 'pending' });
  notifyIfLive(roomId, playerId, { status: 'pending' });

  try {
    const result = await scrapePlayerProfile(url);
    db.updateCricheroesCache(roomId, playerId, { status: 'ok', photoUrl: result.photoUrl, stats: result.stats });
    notifyIfLive(roomId, playerId, { status: 'ok', photoUrl: result.photoUrl, stats: result.stats });
  } catch (err: any) {
    const message = err?.message || 'Unknown scrape error';
    db.updateCricheroesCache(roomId, playerId, { status: 'failed', error: message });
    notifyIfLive(roomId, playerId, { status: 'failed', error: message });
  }
}

function notifyIfLive(
  roomId: string,
  playerId: string,
  data: { status: 'pending' | 'ok' | 'failed'; photoUrl?: string; stats?: Record<string, string>; error?: string }
) {
  // Only touches the in-memory copy if the room is already loaded (i.e.
  // someone is connected) - if not, the next connection will hydrate the
  // fresh cached data straight from SQLite via loadRoom(), so there's
  // nothing to do here.
  const room = peekRoom(roomId);
  if (room) room.applyCricheroesUpdate(playerId, data);
}
