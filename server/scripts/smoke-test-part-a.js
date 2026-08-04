// Smoke test part A: create a room, run a full bid -> sold flow over the
// real WebSocket protocol (not calling the state machine directly), then
// print the roomId + expectations for part B to check after a server
// restart.
const WebSocket = require('ws');

const BASE = 'http://localhost:3001';

function connect(roomId, role, token, teamId) {
  const params = new URLSearchParams({ room: roomId, role });
  if (token) params.set('token', token);
  if (teamId) params.set('teamId', teamId);
  const ws = new WebSocket(`ws://localhost:3001/?${params.toString()}`);
  // Attach the message listener immediately at connect time (not later),
  // so we never miss the server's initial SYNC that arrives right after
  // the handshake completes.
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

async function main() {
  const createRes = await fetch(`${BASE}/api/auctions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Test Auction',
      teams: [
        { name: 'Alpha CC', code: 'ALP', purse: 1000 },
        { name: 'Beta CC', code: 'BET', purse: 1000 },
      ],
      rules: { timerSeconds: 15, rtmEnabled: false },
      playersCsv: 'name,role,basePrice\nTest Player One,Batsman,100\nTest Player Two,Bowler,80',
    }),
  });
  const created = await createRes.json();
  if (!createRes.ok) throw new Error('create failed: ' + JSON.stringify(created));
  console.log('CREATED', JSON.stringify(created));

  const roomId = created.roomId;
  const adminToken = created.adminToken;
  const teamA = created.teams[0];
  const teamB = created.teams[1];

  const admin = connect(roomId, 'admin', adminToken);
  const bidderA = connect(roomId, 'team', teamA.token, teamA.id);
  const spectator = connect(roomId, 'spectator');

  await Promise.all([waitForOpen(admin), waitForOpen(bidderA), waitForOpen(spectator)]);
  console.log('ALL CONNECTED');

  // Find the first available player from the initial admin SYNC.
  const initial = await waitForSync(admin, (s) => s.players.length === 2);
  const player = initial.players.find((p) => p.status === 'available');
  if (!player) throw new Error('no available player in initial state');

  // Admin selects the player.
  admin.send(JSON.stringify({ type: 'SET_ACTIVE_PLAYER', id: player.id }));
  await waitForSync(spectator, (s) => s.activePlayer?.id === player.id);
  console.log('PLAYER ON THE BLOCK:', player.name);

  // Team A bids (server computes the amount from base price since no bid yet).
  bidderA.send(JSON.stringify({ type: 'PLACE_BID', teamId: teamA.id }));
  const afterBid = await waitForSync(spectator, (s) => s.currentBid > 0);
  console.log('BID PLACED, currentBid =', afterBid.currentBid, 'by', afterBid.highestBidder);
  if (afterBid.highestBidder !== teamA.id) throw new Error('FAIL: highest bidder mismatch');

  // A malicious/buggy client tries to bid as Team B using Team A's authenticated
  // connection info spoofed in the payload - server must ignore the claimed
  // teamId and use the token-authenticated identity, so this should be a no-op
  // (bidderA bidding "as" teamB.id should still register as teamA on the server).
  bidderA.send(JSON.stringify({ type: 'PLACE_BID', teamId: teamB.id, amount: 999 }));
  await new Promise((r) => setTimeout(r, 300));

  // Admin marks sold.
  admin.send(JSON.stringify({ type: 'MARK_SOLD' }));
  const sold = await waitForSync(spectator, (s) => s.players.find((p) => p.id === player.id)?.status === 'sold');
  const soldPlayer = sold.players.find((p) => p.id === player.id);
  const teamAAfter = sold.teams.find((t) => t.id === teamA.id);
  console.log('SOLD:', soldPlayer.name, 'to', soldPlayer.teamId, 'for', soldPlayer.soldPrice, 'L');
  console.log('TEAM A PURSE AFTER:', teamAAfter.purse, '(started at 1000)');

  if (soldPlayer.teamId !== teamA.id) throw new Error('FAIL: wrong team won the player');
  if (teamAAfter.purse !== 1000 - soldPlayer.soldPrice) throw new Error('FAIL: purse not deducted correctly');
  if (teamAAfter.players.length !== 1) throw new Error('FAIL: roster not updated');

  console.log('PART_A_OK', roomId, soldPlayer.id, soldPlayer.soldPrice, teamA.id, teamAAfter.purse);

  admin.close(); bidderA.close(); spectator.close();
}

main().catch((err) => {
  console.error('PART_A_FAILED', err);
  process.exit(1);
});
