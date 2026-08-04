// CricHeroes sync isolation test: proves a scrape failure (bad URL, or a
// real navigate/launch failure) never crashes the server or blocks the
// live bidding path. Does NOT prove the scraper extracts correct data from
// a real CricHeroes page - that could not be verified in the sandbox this
// was built in (see server/src/cricheroesScraper.ts for why). This test is
// specifically about failure-mode safety, which is the property that
// actually matters for "never breaks a live auction."
const { connect, waitForOpen, waitForSync, createAuction, sleep, assert } = require('./ws-test-helpers');

async function main() {
  const created = await createAuction({
    name: 'CricHeroes Isolation Test',
    teams: [
      { name: 'Alpha CC', code: 'ALP', purse: 1000 },
      { name: 'Beta CC', code: 'BET', purse: 1000 },
    ],
    rules: { timerSeconds: 15, rtmEnabled: false },
    players: [{ name: 'Test Player', role: 'Batsman', basePrice: 50 }],
  });
  const roomId = created.roomId;
  const adminToken = created.adminToken;

  const admin = connect(roomId, 'admin', adminToken);
  await waitForOpen(admin);
  const initial = await waitForSync(admin, (s) => s.players.length === 1);
  const player = initial.players[0];
  assert(player.cricheroesStatus === 'none', 'player with no CricHeroes URL should start as none');
  console.log('SETUP_OK player created with cricheroesStatus=none');

  // 1) A URL that doesn't even look like a CricHeroes profile - should be
  // rejected by isLikelyCricheroesUrl() before any browser launch is attempted.
  let res = await fetch(`http://localhost:3001/api/auctions/${roomId}/players/${player.id}/sync-cricheroes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: JSON.stringify({ cricheroesUrl: 'https://example.com/not-cricheroes' }),
  });
  let body = await res.json();
  assert(res.ok, 'sync endpoint should respond 200 even when the scrape itself fails');
  assert(body.player.cricheroesStatus === 'failed', 'malformed URL should end in failed status, not crash');
  console.log('TEST1_OK malformed URL rejected gracefully, status=failed, server still responding');

  // 2) A well-formed CricHeroes URL - this WILL fail in this sandbox
  // (headless Chromium cannot launch here), which is exactly the failure
  // mode this test is checking is handled safely.
  res = await fetch(`http://localhost:3001/api/auctions/${roomId}/players/${player.id}/sync-cricheroes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: JSON.stringify({ cricheroesUrl: 'https://cricheroes.com/player-profile/4148310/Player4/matches' }),
  });
  body = await res.json();
  assert(res.ok, 'sync endpoint should still respond 200 on a launch/navigate failure');
  assert(
    body.player.cricheroesStatus === 'ok' || body.player.cricheroesStatus === 'failed',
    'status should resolve to ok or failed, never stuck pending'
  );
  console.log('TEST2_OK real profile URL handled without crashing (status=' + body.player.cricheroesStatus + ')');

  // 3) Prove the server itself is still fully healthy and the live bidding
  // path is unaffected - create a second, unrelated room and run a bid
  // through it.
  const second = await createAuction({
    name: 'Post-Sync Health Check',
    teams: [
      { name: 'Gamma CC', code: 'GAM', purse: 1000 },
      { name: 'Delta CC', code: 'DEL', purse: 1000 },
    ],
    rules: { timerSeconds: 15, rtmEnabled: false },
    players: [{ name: 'Health Check Player', role: 'Bowler', basePrice: 30 }],
  });
  const admin2 = connect(second.roomId, 'admin', second.adminToken);
  const bidder2 = connect(second.roomId, 'team', second.teams[0].token, second.teams[0].id);
  await Promise.all([waitForOpen(admin2), waitForOpen(bidder2)]);
  const s2 = await waitForSync(admin2, (s) => s.players.length === 1);
  admin2.send(JSON.stringify({ type: 'SET_ACTIVE_PLAYER', id: s2.players[0].id }));
  await waitForSync(admin2, (s) => s.activePlayer?.id === s2.players[0].id);
  bidder2.send(JSON.stringify({ type: 'PLACE_BID', teamId: second.teams[0].id }));
  const afterBid = await waitForSync(admin2, (s) => s.currentBid > 0);
  assert(afterBid.currentBid === 30, 'unrelated room should bid normally after CricHeroes failures elsewhere');
  console.log('TEST3_OK live bidding on an unrelated room works fine after two sync failures');

  console.log('PART_D_OK CricHeroes sync is properly isolated from the live auction path');
  [admin, admin2, bidder2].forEach((ws) => ws.close());
}

main().catch((err) => {
  console.error('PART_D_FAILED', err.message);
  process.exit(1);
});
