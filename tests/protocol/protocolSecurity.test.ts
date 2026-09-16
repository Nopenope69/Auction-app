import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '..', '..', 'data_test_protocol');
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.PORT = '3919';

import { server } from '../../server/src/index';
import * as db from '../../server/src/db';
import { DEFAULT_RULES } from '../../server/src/types';

function createClient(url: string) {
  const ws = new WebSocket(url);
  const queue: any[] = [];
  const waiters: ((val: any) => void)[] = [];
  let closeResolver: ((code: number) => void) | null = null;

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (waiters.length > 0) {
        waiters.shift()!(parsed);
      } else {
        queue.push(parsed);
      }
    } catch {
      // Non-json
    }
  });

  ws.on('close', (code) => {
    if (closeResolver) closeResolver(code);
  });

  const waitForOpen = () => new Promise<void>((resolve) => ws.on('open', () => resolve()));
  const waitForClose = () => new Promise<number>((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) resolve(4000);
    else closeResolver = resolve;
  });
  const nextMessage = () => {
    if (queue.length > 0) return Promise.resolve(queue.shift());
    return new Promise<any>((resolve) => waiters.push(resolve));
  };

  return { ws, waitForOpen, waitForClose, nextMessage };
}

describe('WebSocket Protocol Security & Hardening', () => {
  const roomId = 'prot_room_' + Math.random().toString(36).slice(2, 8);
  const adminToken = 'admin_secret_999';
  const teamToken = 'team_secret_888';
  let serverInstance: any;

  beforeAll(async () => {
    db.createRoom({
      roomId,
      name: 'Security Test Room',
      adminToken,
      rules: DEFAULT_RULES,
      teams: [
        {
          id: 'team_alpha',
          name: 'Alpha Team',
          code: 'ALP',
          purse: 100,
          originalPurse: 100,
          rtmCards: 0,
          rosterIds: [],
          token: teamToken,
        },
      ],
      players: [
        {
          id: 'p_1',
          name: 'Target Player',
          role: 'Batsman',
          basePrice: 20,
          status: 'available',
        },
      ],
    });

    await new Promise<void>((resolve) => {
      serverInstance = server.listen(3919, () => resolve());
    });
  });

  afterAll(async () => {
    if (serverInstance) {
      if (typeof serverInstance.closeAllConnections === 'function') {
        serverInstance.closeAllConnections();
      }
      await new Promise<void>((resolve) => {
        serverInstance.close(() => resolve());
      });
    }
  });

  it('rejects connection with invalid admin token (code 4001)', async () => {
    const client = createClient(`ws://localhost:3919/?room=${roomId}&role=admin&token=wrong_token`);
    const closeCode = await client.waitForClose();
    expect(closeCode).toBe(4001);
  });

  it('rejects connection with nonexistent room (code 4004)', async () => {
    const client = createClient(`ws://localhost:3919/?room=nonexistent_room&role=spectator`);
    const closeCode = await client.waitForClose();
    expect(closeCode).toBe(4004);
  });

  it('handles malformed JSON without crashing the server', async () => {
    const client = createClient(`ws://localhost:3919/?room=${roomId}&role=spectator`);
    await client.waitForOpen();
    const sync = await client.nextMessage();
    expect(sync.type).toBe('SYNC');

    // Send malformed JSON
    client.ws.send('{malformed json string');
    const response = await client.nextMessage();

    expect(response.type).toBe('ERROR');
    expect(response.message).toContain('Malformed JSON payload');
    client.ws.close();
  });

  it('rejects PLACE_BID with non-numeric object amount without crashing (Critical S1 fix)', async () => {
    const client = createClient(`ws://localhost:3919/?room=${roomId}&role=team&token=${teamToken}&teamId=team_alpha`);
    await client.waitForOpen();
    const sync = await client.nextMessage();
    expect(sync.type).toBe('SYNC');

    // Attack payload that crashed the original server
    client.ws.send(JSON.stringify({ type: 'PLACE_BID', amount: {} }));

    const response = await client.nextMessage();
    expect(response.type).toBe('ERROR');
    expect(response.message).toContain('Invalid message payload');
    client.ws.close();
  });

  it('rejects string amounts (S2 fix: prevents string concatenation)', async () => {
    const client = createClient(`ws://localhost:3919/?room=${roomId}&role=team&token=${teamToken}&teamId=team_alpha`);
    await client.waitForOpen();
    const sync = await client.nextMessage();
    expect(sync.type).toBe('SYNC');

    client.ws.send(JSON.stringify({ type: 'PLACE_BID', amount: '70' }));

    const response = await client.nextMessage();
    expect(response.type).toBe('ERROR');
    expect(response.message).toContain('Invalid message payload');
    client.ws.close();
  });

  it('enforces message authorization: spectator cannot execute admin actions', async () => {
    const client = createClient(`ws://localhost:3919/?room=${roomId}&role=spectator`);
    await client.waitForOpen();
    const sync = await client.nextMessage();
    expect(sync.type).toBe('SYNC');

    client.ws.send(JSON.stringify({ type: 'START_TIMER' }));

    const response = await client.nextMessage();
    expect(response.type).toBe('ERROR');
    expect(response.message).toContain('Unauthorized');
    client.ws.close();
  });

  it('enforces rate limiting when connection is flooded with messages', async () => {
    const client = createClient(`ws://localhost:3919/?room=${roomId}&role=spectator`);
    await client.waitForOpen();
    const sync = await client.nextMessage();
    expect(sync.type).toBe('SYNC');

    let rateLimited = false;
    client.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ERROR' && msg.message.includes('Rate limit exceeded')) {
          rateLimited = true;
        }
      } catch {}
    });

    // Send 35 messages rapidly
    for (let i = 0; i < 35; i++) {
      client.ws.send(JSON.stringify({ type: 'REACTION', emoji: '👏' }));
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(rateLimited).toBe(true);
    client.ws.close();
  });
});
