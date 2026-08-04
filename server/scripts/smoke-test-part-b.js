// Smoke test part B: run this AFTER killing and restarting the server
// process against the same data directory. If the sold player and the
// deducted purse are still there, state genuinely survived a restart -
// this is the concrete proof of the reliability wedge from the PRD (no
// in-memory-only state, no "auction disappeared after an hour").
const WebSocket = require('ws');

const [, , roomId, expectedPlayerId, expectedSoldPrice, expectedTeamId, expectedPurse] = process.argv;

const ws = new WebSocket(`ws://localhost:3001/?room=${roomId}&role=spectator`);

ws.on('open', () => console.log('RECONNECTED AFTER RESTART, room:', roomId));

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type !== 'SYNC') return;
  const state = msg.state;
  const player = state.players.find((p) => p.id === expectedPlayerId);
  const team = state.teams.find((t) => t.id === expectedTeamId);

  console.log('POST-RESTART player status:', player?.status, 'soldPrice:', player?.soldPrice, 'teamId:', player?.teamId);
  console.log('POST-RESTART team purse:', team?.purse, 'roster size:', team?.players.length);

  const ok =
    player &&
    player.status === 'sold' &&
    String(player.soldPrice) === expectedSoldPrice &&
    player.teamId === expectedTeamId &&
    team &&
    String(team.purse) === expectedPurse &&
    team.players.length === 1;

  if (ok) {
    console.log('PART_B_OK - state survived server restart intact');
    process.exit(0);
  } else {
    console.error('PART_B_FAILED - state mismatch after restart');
    process.exit(1);
  }
});

ws.on('error', (err) => {
  console.error('PART_B_FAILED - connection error', err);
  process.exit(1);
});

setTimeout(() => {
  console.error('PART_B_FAILED - timeout waiting for SYNC');
  process.exit(1);
}, 5000);
