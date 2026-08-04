// Shared helpers for the smoke-test scripts. Not part of the build (this
// directory isn't included by tsconfig), just plain Node run directly
// against a running server instance.
const WebSocket = require('ws');

function connect(roomId, role, token, teamId) {
  const params = new URLSearchParams({ room: roomId, role });
  if (token) params.set('token', token);
  if (teamId) params.set('teamId', teamId);
  const ws = new WebSocket(`ws://localhost:3001/?${params.toString()}`);
  ws.lastState = null;
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'SYNC') ws.lastState = msg.state;
  });
  return ws;
}

function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
}

function waitForSync(ws, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (ws.lastState && predicate(ws.lastState)) return resolve(ws.lastState);
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout waiting for SYNC matching predicate'));
      setTimeout(poll, 50);
    };
    poll();
  });
}

async function createAuction(body) {
  const res = await fetch('http://localhost:3001/api/auctions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('create failed: ' + JSON.stringify(data));
  return data;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function assert(cond, message) {
  if (!cond) throw new Error('ASSERTION FAILED: ' + message);
}

module.exports = { connect, waitForOpen, waitForSync, createAuction, sleep, assert };
