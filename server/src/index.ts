import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';

import {
  AuctionRules,
  ClientMessage,
  ClientMessageSchema,
  DEFAULT_RULES,
  Player,
  Role,
  Team,
} from './types';
import { parseCsv } from './csv';
import * as db from './db';
import { getRoom, forgetRoom } from './roomManager';
import { syncPlayerCricheroes } from './cricheroesSync';

dotenv.config();

// Global Process Crash Boundaries (A-002)
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const port = Number(process.env.PORT) || 3001;
const ENABLE_CRICHEROES = process.env.ENABLE_CRICHEROES === 'true';

// Multer upload limits (A-005)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

// Helmet security headers (A-005)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration (A-005)
const ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS allowlist'));
      }
    },
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.text({ type: 'text/csv', limit: '5mb' }));

// Fire-and-forget helper for auto-sync after import
async function autoSyncCricheroes(roomId: string, players: Player[]) {
  if (!ENABLE_CRICHEROES) return;
  for (const p of players) {
    if (!p.cricheroesUrl) continue;
    await syncPlayerCricheroes(roomId, p.id, p.cricheroesUrl).catch((err) =>
      console.error(`CricHeroes auto-sync failed for player ${p.id}:`, err)
    );
  }
}

function shortId(bytes = 6): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

// ---- Health & Diagnostics Probes (C-003) ----
app.get('/livez', (_req, res) => {
  res.json({ status: 'alive' });
});

app.get('/readyz', (_req, res) => {
  try {
    db.db.prepare('SELECT 1').get();
    res.json({ status: 'ready', db: 'ok' });
  } catch (err: any) {
    res.status(503).json({ status: 'not_ready', error: err.message });
  }
});

app.get('/api/version', (_req, res) => {
  res.json({
    name: 'cricket-auction-platform',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    node: process.version,
  });
});


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

// Admin Link Recovery (D-001)
app.get('/api/auctions/:roomId/team-links', (req, res) => {
  const roomId = req.params.roomId;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }
  const teams = db.listTeamLinks(roomId);
  res.json({ teams });
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
      players = req.body.map((p: any, i: number) => ({
        id: p.id || `p_${shortId(3)}`,
        name: String(p.name || `Player ${i + 1}`).slice(0, 100),
        role: p.role || 'Batsman',
        basePrice: Math.max(1, Number(p.basePrice) || 20),
        photoUrl: p.photoUrl,
        previousTeamCode: p.previousTeamCode,
        status: 'available',
      }));
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
    if (ENABLE_CRICHEROES) {
      autoSyncCricheroes(roomId, players).catch(() => {});
    }

    res.json({ success: true, count: players.length, errors });
  } catch (err: any) {
    console.error('Error uploading players:', err);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// Admin CRUD Endpoints (D-001)
app.post('/api/auctions/:roomId/players/manual', (req, res) => {
  const roomId = req.params.roomId;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Auction not found.' });

  const { name, role, basePrice, photoUrl, previousTeamCode } = req.body || {};
  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required.' });
  }

  const newPlayer: Player = {
    id: `p_${shortId(4)}`,
    name: String(name).trim(),
    role,
    basePrice: Number(basePrice) > 0 ? Number(basePrice) : 20,
    photoUrl,
    previousTeamCode,
    status: 'available',
  };

  if (!room.addManualPlayer(newPlayer)) {
    return res.status(400).json({ error: 'Could not add player.' });
  }
  res.json({ success: true, player: newPlayer });
});

app.patch('/api/auctions/:roomId/players/:playerId', (req, res) => {
  const { roomId, playerId } = req.params;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Auction not found.' });

  const updates = req.body || {};
  if (!room.updatePlayer(playerId, updates)) {
    return res.status(400).json({ error: 'Could not update player.' });
  }
  res.json({ success: true });
});

app.delete('/api/auctions/:roomId/players/:playerId', (req, res) => {
  const { roomId, playerId } = req.params;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Auction not found.' });

  if (!room.deletePlayer(playerId)) {
    return res.status(400).json({ error: 'Could not delete player (player may be on the block or sold).' });
  }
  res.json({ success: true });
});

app.patch('/api/auctions/:roomId/teams/:teamId', (req, res) => {
  const { roomId, teamId } = req.params;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Auction not found.' });

  const updates = req.body || {};
  if (!room.updateTeam(teamId, updates)) {
    return res.status(400).json({ error: 'Could not update team.' });
  }
  res.json({ success: true });
});

// Auction Completion Lifecycle (D-002)
app.post('/api/auctions/:roomId/complete', (req, res) => {
  const roomId = req.params.roomId;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Auction not found.' });

  if (!room.endAuction()) {
    return res.status(400).json({ error: 'Auction already completed.' });
  }
  res.json({ success: true, status: 'completed' });
});

// Complete Data Purge (F-001 DPDP Compliance)
app.delete('/api/auctions/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }

  forgetRoom(roomId, true);
  db.deleteRoom(roomId);
  res.json({ success: true, message: 'Auction room and personal data completely deleted.' });
});

// Admin-triggered, single player CricHeroes sync
app.post('/api/auctions/:roomId/players/:playerId/sync-cricheroes', async (req, res) => {
  if (!ENABLE_CRICHEROES) {
    return res.status(503).json({ error: 'CricHeroes integration is disabled on this server.' });
  }
  const { roomId, playerId } = req.params;
  const adminToken = req.header('x-admin-token') || '';
  if (!db.isAdminToken(roomId, adminToken)) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }

  const url = typeof req.body?.cricheroesUrl === 'string' ? req.body.cricheroesUrl.trim() : '';
  if (!url) return res.status(400).json({ error: 'cricheroesUrl is required.' });

  db.setCricheroesUrl(roomId, playerId, url);
  const room = getRoom(roomId);
  if (room) room.applyCricheroesUpdate(playerId, { status: 'pending' });

  await syncPlayerCricheroes(roomId, playerId, url);
  const snapshot = db.loadRoom(roomId);
  const player = snapshot?.players.find((p) => p.id === playerId);
  res.json({ player });
});

app.post('/api/auctions/:roomId/sync-cricheroes-all', (req, res) => {
  if (!ENABLE_CRICHEROES) {
    return res.status(503).json({ error: 'CricHeroes integration is disabled on this server.' });
  }
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

// Single-Origin Static Serving (C-001)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/livez') || req.path.startsWith('/readyz')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);

// WebSocket Server with Payload Limit (A-005: 4KB max payload)
const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 4096,
});

// Origin Validation on Handshake (A-006 / RFC 6455)
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // non-browser clients (tests, curl)
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes('*')) return true;
  try {
    const url = new URL(origin);
    return ALLOWED_ORIGINS.some((allowed) => url.origin === allowed || url.host === allowed);
  } catch {
    return false;
  }
}

server.on('upgrade', (request, socket, head) => {
  const origin = request.headers.origin;
  if (!isOriginAllowed(origin)) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

interface ConnMeta {
  roomId: string;
  role: Role;
  teamId: string | null;
}
const connMeta = new WeakMap<WebSocket, ConnMeta>();
const roomConnections = new Map<string, Set<WebSocket>>();
const roomUnsubscribers = new Map<string, () => void>();

// Rate limiting (A-006)
interface RateBucket {
  messages: number;
  lastMsgReset: number;
  reactions: number;
  lastReactionReset: number;
}
const connLimits = new WeakMap<WebSocket, RateBucket>();

function checkRateLimit(ws: WebSocket, isReaction: boolean): boolean {
  let bucket = connLimits.get(ws);
  const now = Date.now();
  if (!bucket) {
    bucket = { messages: 0, lastMsgReset: now, reactions: 0, lastReactionReset: now };
    connLimits.set(ws, bucket);
  }
  if (now - bucket.lastMsgReset > 3000) {
    bucket.messages = 0;
    bucket.lastMsgReset = now;
  }
  bucket.messages += 1;
  if (bucket.messages > 30) return false;

  if (isReaction) {
    if (now - bucket.lastReactionReset > 3000) {
      bucket.reactions = 0;
      bucket.lastReactionReset = now;
    }
    bucket.reactions += 1;
    if (bucket.reactions > 6) return false;
  }
  return true;
}

function broadcastRoom(roomId: string, message: any) {
  const conns = roomConnections.get(roomId);
  if (!conns) return;
  const data = JSON.stringify(message);
  conns.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });
}

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
    try {
      if (!checkRateLimit(ws, false)) {
        sendError(ws, 'Rate limit exceeded. Please slow down.');
        return;
      }

      let rawObj: any;
      try {
        rawObj = JSON.parse(raw.toString());
      } catch {
        sendError(ws, 'Malformed JSON payload.');
        return;
      }

      const parsed = ClientMessageSchema.safeParse(rawObj);
      if (!parsed.success) {
        sendError(ws, `Invalid message payload: ${parsed.error.issues[0]?.message || 'Schema validation failed'}`);
        return;
      }

      const msg = parsed.data;
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
              sendError(ws, 'Bid rejected - check legal increment, base price, or purse balance.');
            }
          } else {
            sendError(ws, 'Unauthorized: only active team bidders may place bids.');
          }
          break;

        case 'SET_ACTIVE_PLAYER':
          if (isAdmin) {
            if (!r.setActivePlayer(msg.id)) sendError(ws, 'Could not put player on the block.');
          } else {
            sendError(ws, 'Unauthorized: admin only.');
          }
          break;

        case 'START_TIMER':
          if (isAdmin) r.startTimer();
          else sendError(ws, 'Unauthorized: admin only.');
          break;

        case 'PAUSE_TIMER':
          if (isAdmin) r.pauseTimer();
          else sendError(ws, 'Unauthorized: admin only.');
          break;

        case 'MARK_SOLD':
          if (isAdmin) {
            if (!r.markSold()) sendError(ws, 'Could not mark sold - no active player with a bid.');
          } else {
            sendError(ws, 'Unauthorized: admin only.');
          }
          break;

        case 'MARK_UNSOLD':
          if (isAdmin) {
            if (!r.markUnsold()) sendError(ws, 'Could not mark unsold - no active player.');
          } else {
            sendError(ws, 'Unauthorized: admin only.');
          }
          break;

        case 'EXERCISE_RTM':
          if (isAdmin) {
            if (!r.exerciseRtm(msg.accept)) {
              sendError(ws, 'RTM decision rejected (insufficient purse or no pending RTM).');
            }
          } else {
            sendError(ws, 'Unauthorized: admin only.');
          }
          break;

        case 'UNDO_ACTION':
          if (isAdmin) {
            if (!r.undo()) sendError(ws, 'Nothing to undo.');
          } else {
            sendError(ws, 'Unauthorized: admin only.');
          }
          break;

        case 'RESET':
          if (isAdmin) r.resetAuction();
          else sendError(ws, 'Unauthorized: admin only.');
          break;

        case 'END_AUCTION':
          if (isAdmin) {
            if (!r.endAuction()) sendError(ws, 'Auction already completed.');
          } else {
            sendError(ws, 'Unauthorized: admin only.');
          }
          break;

        case 'REACTION':
          if (checkRateLimit(ws, true)) {
            broadcastRoom(meta.roomId, { type: 'REACTION', emoji: msg.emoji });
          }
          break;

        default:
          break;
      }
    } catch (err: any) {
      console.error('[WS ERROR]', err);
      sendError(ws, 'Internal auction engine error.');
    }
  });

  ws.on('close', () => {
    const meta = connMeta.get(ws);
    if (!meta) return;
    roomConnections.get(meta.roomId)?.delete(ws);
    if ((roomConnections.get(meta.roomId)?.size || 0) === 0) {
      roomUnsubscribers.get(meta.roomId)?.();
      roomUnsubscribers.delete(meta.roomId);
      roomConnections.delete(meta.roomId);
      forgetRoom(meta.roomId, false);
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Cricket Auction Platform server running on port ${port}`);
  });
}
export { app, server };

