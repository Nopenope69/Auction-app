import { seedDemoRoom } from './seedDemo';

try {
  const result = seedDemoRoom(true);
  console.log(`[SEED SUCCESS] Populated tournament room: "${result.roomId}"`);
  console.log(`Admin Token: ${result.adminToken}`);
  console.log(`Franchise Teams (${result.teams.length}):`);
  result.teams.forEach((t) => {
    console.log(` - [${t.code}] ${t.name} (Purse: ${t.purse}L, Token: ${t.token})`);
  });
  console.log(`Player Pool: ${result.playersCount} players loaded with career stats & RTM eligibility.`);
} catch (err) {
  console.error('[SEED ERROR]', err);
  process.exit(1);
}
