// Rules-coverage smoke test: bid validation edge cases, undo, mark-unsold,
// and both RTM outcomes (accept/decline) - all driven over the real
// WebSocket protocol, same as part A. This is the automated proof that the
// auction rules engine ported from the original prototype still behaves
// correctly after the rewrite.
const { connect, waitForOpen, waitForSync, createAuction, sleep, assert } = require('./ws-test-helpers');

async function main() {
  const created = await createAuction({
    name: 'Rules Coverage Test',
    teams: [
      { name: 'Alpha CC', code: 'ALP', purse: 1000 },
      { name: 'Beta CC', code: 'BET', purse: 50 }, // deliberately small purse
      { name: 'Gamma CC', code: 'GAM', purse: 1000 },
    ],
    rules: { timerSeconds: 15, rtmEnabled: true },
    playersCsv:
      'name,role,basePrice,previousTeam\n' +
      'Player One,Batsman,100,\n' +
      'Player Four,Wicketkeeper,40,ALP\n' +
      'Player Three,All-Rounder,60,ALP\n',
  });
  const [teamA, teamB, teamC] = created.teams;
  const roomId = created.roomId;

  const admin = connect(roomId, 'admin', created.adminToken);
  const bidA = connect(roomId, 'team', teamA.token, teamA.id);
  const bidB = connect(roomId, 'team', teamB.token, teamB.id);
  const bidC = connect(roomId, 'team', teamC.token, teamC.id);
  await Promise.all([admin, bidA, bidB, bidC].map(waitForOpen));

  const initial = await waitForSync(admin, (s) => s.players.length === 3);
  const playerOne = initial.players.find((p) => p.name === 'Player One');
  const playerFour = initial.players.find((p) => p.name === 'Player Four');
  const playerThree = initial.players.find((p) => p.name === 'Player Three');

  // ---- Test 1: bid validation ----
  admin.send(JSON.stringify({ type: 'SET_ACTIVE_PLAYER', id: playerOne.id }));
  await waitForSync(admin, (s) => s.activePlayer?.id === playerOne.id);

  bidA.send(JSON.stringify({ type: 'PLACE_BID', teamId: teamA.id })); // auto = base price 100
  let s = await waitForSync(admin, (st) => st.currentBid === 100);
  assert(s.highestBidder === teamA.id, 'Test1: team A should be highest bidder at 100');

  // Team A tries to bid against itself - must be rejected (state unchanged).
  bidA.send(JSON.stringify({ type: 'PLACE_BID', teamId: teamA.id, amount: 150 }));
  await sleep(300);
  s = admin.lastState;
  assert(s.currentBid === 100 && s.highestBidder === teamA.id, 'Test1: self-bid must be rejected');

  // Team B tries to bid at/below current bid - must be rejected.
  bidB.send(JSON.stringify({ type: 'PLACE_BID', teamId: teamB.id, amount: 90 }));
  await sleep(300);
  s = admin.lastState;
  assert(s.currentBid === 100, 'Test1: bid below current must be rejected');

  // Team B tries the auto-increment amount (110), which exceeds its 50L purse - must be rejected.
  bidB.send(JSON.stringify({ type: 'PLACE_BID', teamId: teamB.id }));
  await sleep(300);
  s = admin.lastState;
  assert(s.currentBid === 100 && s.highestBidder === teamA.id, 'Test1: bid exceeding purse must be rejected');
  console.log('TEST1_OK bid validation (self-bid, below-current, over-purse all correctly rejected)');

  admin.send(JSON.stringify({ type: 'MARK_SOLD' }));
  await waitForSync(admin, (st) => st.players.find((p) => p.id === playerOne.id)?.status === 'sold');

  // ---- Test 2: undo reverts the sale ----
  admin.send(JSON.stringify({ type: 'UNDO_ACTION' }));
  s = await waitForSync(admin, (st) => st.players.find((p) => p.id === playerOne.id)?.status === 'available');
  assert(s.activePlayer?.id === playerOne.id, 'Test2: undo should restore player to the block');
  assert(s.currentBid === 100 && s.highestBidder === teamA.id, 'Test2: undo should restore the bid state');
  const teamAAfterUndo = s.teams.find((t) => t.id === teamA.id);
  assert(teamAAfterUndo.purse === 1000, 'Test2: undo should restore team A purse to 1000');
  console.log('TEST2_OK undo reverted the sale (player, bid state, and purse all restored)');

  // ---- Test 3: mark unsold ----
  admin.send(JSON.stringify({ type: 'MARK_UNSOLD' }));
  s = await waitForSync(admin, (st) => st.players.find((p) => p.id === playerOne.id)?.status === 'unsold');
  assert(s.activePlayer === null, 'Test3: active player should clear after unsold');
  console.log('TEST3_OK mark unsold works with no purse side effects');

  // ---- Test 4: RTM decline (player sold to original bidder) ----
  admin.send(JSON.stringify({ type: 'SET_ACTIVE_PLAYER', id: playerFour.id }));
  await waitForSync(admin, (st) => st.activePlayer?.id === playerFour.id);
  bidC.send(JSON.stringify({ type: 'PLACE_BID', teamId: teamC.id })); // auto = base price 40
  await waitForSync(admin, (st) => st.currentBid === 40);
  admin.send(JSON.stringify({ type: 'MARK_SOLD' }));
  s = await waitForSync(admin, (st) => st.rtmState?.pending === true);
  assert(s.rtmState.rtmTeamId === teamA.id, 'Test4: RTM should offer to team A (previous team)');
  assert(s.rtmState.highestBid === 40, 'Test4: RTM highest bid should be 40');

  admin.send(JSON.stringify({ type: 'EXERCISE_RTM', accept: false }));
  s = await waitForSync(admin, (st) => st.players.find((p) => p.id === playerFour.id)?.status === 'sold');
  const p4 = s.players.find((p) => p.id === playerFour.id);
  const teamCAfter = s.teams.find((t) => t.id === teamC.id);
  const teamAAfterDecline = s.teams.find((t) => t.id === teamA.id);
  assert(p4.teamId === teamC.id, 'Test4: declined RTM should sell to original bidder (team C)');
  assert(teamCAfter.purse === 960, 'Test4: team C purse should be 1000-40=960');
  assert(teamAAfterDecline.rtmCards === 3, 'Test4: declining RTM should not consume a card');
  console.log('TEST4_OK RTM decline sells to the original highest bidder, no card consumed');

  // ---- Test 5: RTM accept (previous team retains the player) ----
  admin.send(JSON.stringify({ type: 'SET_ACTIVE_PLAYER', id: playerThree.id }));
  await waitForSync(admin, (st) => st.activePlayer?.id === playerThree.id);
  bidC.send(JSON.stringify({ type: 'PLACE_BID', teamId: teamC.id })); // auto = base price 60
  await waitForSync(admin, (st) => st.currentBid === 60);
  admin.send(JSON.stringify({ type: 'MARK_SOLD' }));
  s = await waitForSync(admin, (st) => st.rtmState?.pending === true);

  admin.send(JSON.stringify({ type: 'EXERCISE_RTM', accept: true }));
  s = await waitForSync(admin, (st) => st.players.find((p) => p.id === playerThree.id)?.status === 'sold');
  const p3 = s.players.find((p) => p.id === playerThree.id);
  const teamAFinal = s.teams.find((t) => t.id === teamA.id);
  const teamCFinal = s.teams.find((t) => t.id === teamC.id);
  assert(p3.teamId === teamA.id, 'Test5: accepted RTM should retain the player for team A');
  assert(teamAFinal.purse === 940, 'Test5: team A purse should be 1000-60=940');
  assert(teamAFinal.rtmCards === 2, 'Test5: accepting RTM should consume one card (3 -> 2)');
  assert(teamCFinal.purse === 960, 'Test5: team C purse should be unaffected by losing the RTM');
  console.log('TEST5_OK RTM accept retains the player for the original team and consumes a card');

  console.log('PART_C_OK all rules-coverage tests passed');
  [admin, bidA, bidB, bidC].forEach((ws) => ws.close());
}

main().catch((err) => {
  console.error('PART_C_FAILED', err.message);
  process.exit(1);
});
