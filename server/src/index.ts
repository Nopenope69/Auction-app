import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';

import { AuctionRules, ClientMessage, DEFAULT_RULES, Player, Role, Team } from './types';
import { parseCsv } from './csv';
import * as db from './db';
import { getRoom, forgetRoom } from './roomManager';
import { syncPlayerCricheroes } from './cricheroesSync';

// Fire-and-forget helper for auto-sync after import - runs sequentially
// (not Promise.all) so we don't launch a dozen headless browsers at once
// off the back of one CSV upload. Errors are swallowed per-player; each
// player's own cricheroesStatus/cricheroesError field is where failures
// actually surface, not the server console.
async function autoSyncCricheroes(roomId: string, players: Player[]) {
  for (const p of players) {
    if (!p.cricheroesUrl) continue;
    await syncPlayerCricheroes(roomId, p.id, p.cricheroesUrl).catch((err) =>
      console.error(`CricHeroes auto-sync failed for player ${p.id}:`, err)
    );
  }
}

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/csv', limit: '10mb' }));

function shortId(bytes = 6): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

// ---- REST: create + configure an auction room ----

app.post('/api/auctions', (req, res) => {
  try {
    const body = req.body || {};
    const name: string = (body.name || 'Untitled Auction').trim();
    const teamsInput: { name: string; code: string; purse: number }[] = Array.isArray(body.teams) ? body.teams : [];

    if (teamsInput.length < 2) {
      return res.status(400).json({ error: 'At least 2 teams are required to run an auction.' });
    }

    const rules: AuctionRules = {
      timerSeconds: Number(body.rules?.timerSeconds) > 0 ? Number(body.rules.timerSeconds) : DEFAULT_RULES.timerSeconds,
      rtmEnabled: !!body.rules?.rtmEnabled,
      incrementTiers: Array.isArray(body.rules?.incrementTiers) && body.rules.incrementTiers.length > 0
        ? body.rules.incrementTiers
        : DEFAULT_RULES.incrementTiers,
    };

    const roomId = shortId(4);
    const adminToken = shortId(16);

    const teams: Team[] = teamsInput.map((t, idx) => {
      const purse = Number(t.purse) > 0 ? Number(t.purse) : 10000;
      return {
        id: `team_${idx}_${shortId(3)}`,
        name: (t.name || `Team ${idx + 1}`).trim(),
        code: (t.code || `T${idx + 1}`).trim().toUpperCase(),
        purse,
        originalPurse: purse,
        rtmCards: rules.rtmEnabled ? 3 : 0,
        rosterIds: [],
        token: shortId(10),
      };
    });

    let players: Player[] = [];
    let importErrors: { row: number; message: string }[] = [];
    if (typeof body.playersCsv === 'string' && body.playersCsv.trim()) {
      const parsed = parseCsv(body.playersCsv);
      players = parsed.players;
      importErrors = parsed.errors;
    } else if (Array.isArray(body.players)) {
      players = body.players.map((p: any, i: number) => ({
        id: p.id || `p_${shortId(3)}`,
        name: p.name || `Player ${i + 1}`,
        role: p.role || 'Batsman',
        basePrice: Number(p.basePrice) || 20,
        photoUrl: p.photoUrl,
        previousTeamCode: p.previousTeamCode,
        status: 'available',
      }));
    }

    db.createRoom({ roomId, name, adminToken, rules, teams, players });

    // Kick off in the background - do not await. The room isn't even
    // connected to yet at this point, so peekRoom() inside the sync will
    // correctly find nothing live and just update SQLite; the data will be
    // there by the time anyone actually opens the admin console.
    autoSyncCricheroes(roomId, players).catch(() => {});

    res.json({
      roomId,
      name,
      adminToken,
      rules,
      teams: teams.map((t) => ({ id: t.id, name: t.name, code: t.code, purse: t.purse, token: t.token })),
      playersImported: players.length,
      importErrors,
    });
  } catch (err: any) {
    console.error('Error creating auction:', err);
    res.status(500).json({ error: err.message || 'Failed to create auction.' });
  }
});

app.get('/api/auctions/:roomId/info', (req, res) => {
  const info = db.publicRoomInfo(req.params.roomId);
  if (!info) return res.status(404).json({ error: 'Auction not found.' });
  res.json(info);
});

app.post('/api/auctions/:roomId/players', upload.single('file'), (req, res) => {
  const roomId = req.params.roomId;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }

  try {
    let players: Player[] = [];
    let errors: { row: number; message: string }[] = [];

    if (req.file) {
      const parsed = parseCsv(req.file.buffer.toString('utf-8'));
      players = parsed.players;
      errors = parsed.errors;
    } else if (Array.isArray(req.body)) {
      players = req.body;
    } else if (typeof req.body === 'string') {
      const parsed = parseCsv(req.body);
      players = parsed.players;
      errors = parsed.errors;
    }

    if (players.length === 0) {
      return res.status(400).json({ error: 'No valid players found in upload.', errors });
    }

    const room = getRoom(roomId);
    if (!room) return res.status(404).json({ error: 'Auction not found.' });
    room.addPlayers(players);
    autoSyncCricheroes(roomId, players).catch(() => {});

    res.json({ success: true, count: players.length, errors });
  } catch (err: any) {
    console.error('Error uploading players:', err);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// Admin-triggered, single player. Awaited (not fire-and-forget) since this
// is a deliberate user action with a spinner in the UI, not a background
// import step - but still completely outside the WS/bidding path.
app.post('/api/auctions/:roomId/players/:playerId/sync-cricheroes', async (req, res) => {
  const { roomId, playerId } = req.params;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }

  const url = typeof req.body?.cricheroesUrl === 'string' ? req.body.cricheroesUrl.trim() : '';
  if (!url) return res.status(400).json({ error: 'cricheroesUrl is required.' });

  // Persist the URL itself even if the scrape that follows fails, so a
  // retry later doesn't require re-typing it.
  db.setCricheroesUrl(roomId, playerId, url);
  const room = getRoom(roomId);
  if (room) room.applyCricheroesUpdate(playerId, { status: 'pending' });

  await syncPlayerCricheroes(roomId, playerId, url);
  const snapshot = db.loadRoom(roomId);
  const player = snapshot?.players.find((p) => p.id === playerId);
  res.json({ player });
});

// Bulk re-sync for every player in the room that has a CricHeroes URL set.
// Fire-and-forget from the caller's perspective (responds immediately with
// how many were queued) - watch each player's status in the live state to
// see them resolve one by one.
app.post('/api/auctions/:roomId/sync-cricheroes-all', (req, res) => {
  const roomId = req.params.roomId;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }
  const snapshot = db.loadRoom(roomId);
  if (!snapshot) return res.status(404).json({ error: 'Auction not found.' });

  const withUrl = snapshot.players.filter((p) => p.cricheroesUrl);
  autoSyncCricheroes(roomId, withUrl).catch(() => {});
  res.json({ queued: withUrl.length });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface ConnMeta {
  roomId: string;
  role: Role;
  teamId: string | null;
}
const connMeta = new WeakMap<WebSocket, ConnMeta>();
const roomConnections = new Map<string, Set<WebSocket>>();
const roomUnsubscribers = new Map<string, () => void>();

function broadcastRoom(roomId: string, message: any) {
  const conns = roomConnections.get(roomId);
  if (!conns) return;
  const data = JSON.stringify(message);
  conns.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });
}

// Every AuctionRoom mutation returns a boolean and previously had its
// result discarded here - a rejected bid, undo, RTM decision, etc. failed
// completely silently (the ErrorMessage type existed but nothing ever sent
// one). Callers below check the return value and use this to tell the
// single connection that sent the rejected message why nothing happened.
function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ERROR', message }));
  }
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', 'http://localhost');
  const roomId = url.searchParams.get('room') || '';
  const token = url.searchParams.get('token') || '';
  const roleParam = (url.searchParams.get('role') || 'spectator') as Role;
  const teamIdParam = url.searchParams.get('teamId');

  const room = getRoom(roomId);
  if (!room) {
    ws.close(4004, 'Auction not found');
    return;
  }

  let role: Role = 'spectator';
  let teamId: string | null = null;

  if (roleParam === 'admin') {
    if (!db.isAdminToken(roomId, token)) {
      ws.close(4001, 'Invalid admin token');
      return;
    }
    role = 'admin';
  } else if (roleParam === 'team') {
    const team = db.findTeamByToken(roomId, token);
    if (!team || (teamIdParam && team.id !== teamIdParam)) {
      ws.close(4001, 'Invalid team token');
      return;
    }
    role = 'team';
    teamId = team.id;
  } else {
    role = 'spectator';
  }

  connMeta.set(ws, { roomId, role, teamId });
  if (!roomConnections.has(roomId)) roomConnections.set(roomId, new Set());
  roomConnections.get(roomId)!.add(ws);

  if (!roomUnsubscribers.has(roomId)) {
    const unsub = room.onChange(() => {
      broadcastRoom(roomId, { type: 'SYNC', state: room.getFullState() });
    });
    roomUnsubscribers.set(roomId, unsub);
  }

  ws.send(JSON.stringify({ type: 'SYNC', state: room.getFullState() }));

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const meta = connMeta.get(ws);
    if (!meta) return;
    const r = getRoom(meta.roomId);
    if (!r) return;

    const isAdmin = meta.role === 'admin';
    const isTeam = meta.role === 'team';

    switch (msg.type) {
      case 'PLACE_BID':
        if (isTeam && meta.teamId) {
          if (!r.placeBid(meta.teamId, msg.amount)) {
            sendError(ws, 'Bid rejected - the price or your purse balance changed. Check the live figures and try again.');
          }
        }
        break;
      case 'SET_ACTIVE_PLAYER':
        if (isAdmin) {
          if (!r.setActivePlayer(msg.id)) sendError(ws, 'Could not put that player on the block (already sold/unsold, or an invalid id).');
        }
        break;
      case 'START_TIMER':
        if (isAdmin) r.startTimer();
        break;
      case 'PAUSE_TIMER':
        if (isAdmin) r.pauseTimer();
        break;
      case 'MARK_SOLD':
        if (isAdmin) {
          if (!r.markSold()) sendError(ws, 'Could not mark sold - there is no active player with a bid.');
        }
        break;
      case 'MARK_UNSOLD':
        if (isAdmin) {
          if (!r.markUnsold()) sendError(ws, 'Could not mark unsold - there is no active player on the block.');
        }
        break;
      case 'EXERCISE_RTM':
        if (isAdmin) {
          if (!r.exerciseRtm(msg.accept)) sendError(ws, 'No pending Right-to-Match decision for this player.');
        }
        break;
      case 'UNDO_ACTION':
        if (isAdmin) {
          if (!r.undo()) sendError(ws, 'Nothing to undo.');
        }
        break;
      case 'RESET':
        if (isAdmin) r.resetAuction();
        break;
      case 'REACTION':
        broadcastRoom(meta.roomId, { type: 'REACTION', emoji: msg.emoji });
        break;
      default:
        break;
    }
  });

  ws.on('close', () => {
    const meta = connMeta.get(ws);
    if (!meta) return;
    roomConnections.get(meta.roomId)?.delete(ws);
    if ((roomConnections.get(meta.roomId)?.size || 0) === 0) {
      // No one watching this room right now - drop the in-memory instance and
      // its change listener. State is already safe on disk; it will rehydrate
      // from SQLite the next time anyone connects. Keeps memory bounded when
      // a solo founder is running many clubs' auctions on one small server.
      roomUnsubscribers.get(meta.roomId)?.();
      roomUnsubscribers.delete(meta.roomId);
      roomConnections.delete(meta.roomId);
      forgetRoom(meta.roomId);
    }
  });
});

server.listen(port, () => {
  console.log(`Cricket Auction Platform server running on port ${port}`);
});
