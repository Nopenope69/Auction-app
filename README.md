# Cricket Auction Platform (MVP)

A persistent, multi-room cricket auction platform: organisers create a room, get shareable
links for admin control, each team, spectators, and an OBS broadcast overlay, and run a
real-time IPL-style player auction. Built as Phase 0 of the roadmap in the accompanying PRD
("Cricket_Auction_Platform_PRD_Architecture.docx") - this is the "harden it" pass, not the
full feature set.

## What changed from the original prototype

The original repo (`github.com/Nopenope69/Auction-app`) had a genuinely good auction rules
engine (bid validation, undo, RTM) and a full set of page layouts, but had four problems that
made it non-functional or unsafe to ship to real clubs:

1. **Client and server spoke different protocols.** The server broadcast `state_update` /
   expected `place_bid`; the client listened for `SYNC` / sent `PLACE_BID`. A bid placed in
   the UI never reached the auction engine. Fixed by rewriting the server to speak the
   client's protocol (single source of truth: `server/src/types.ts`).
2. **No persistence.** All state lived in one in-memory JS object. A server restart wiped
   every live auction - the same failure mode as a real competitor's documented "auctions
   disappearing after an hour" complaints. Fixed with a SQLite-backed, write-then-broadcast
   persistence layer (`server/src/db.ts`) - every mutation is durable before it's ever shown
   to a client. Verified by an automated test that kills the server mid-auction and confirms
   state survives (see "Smoke test" below).
3. **No auth, single global auction, hardcoded real IPL team names.** Anyone with the URL
   could control the admin console; there was only ever one auction; default teams were
   literally "Chennai Super Kings", "Mumbai Indians", etc. Fixed with per-room admin/team
   tokens, true multi-tenancy (unlimited concurrent rooms, each isolated), and fully
   organiser-defined teams (no trademark exposure).
4. **Tailwind utility classes with no Tailwind installed.** Every page used classes like
   `md:grid-cols-3` and `bg-[rgba(0,0,0,0.5)]` but the project had no Tailwind config, so most
   of the UI would have rendered unstyled. Fixed by installing Tailwind v4 properly.

Kept as-is (they were already solid): the glassmorphism/neon design system in
`client/src/index.css`, the bid/RTM/undo state machine logic (ported into
`server/src/auctionRoom.ts`), the AI Auctioneer (browser text-to-speech, not an LLM -
worth knowing before you market it as "AI"), the sound effects engine, the Pitch Roster
squad-balance visualisation, and the post-auction Tournament Simulator - this last one is a
genuine differentiator; nothing found in the competitive research had it.

## Project structure

- `/server` - Node/Express/WebSocket backend. SQLite persistence (Node's built-in
  `node:sqlite`, no native module install required). One `AuctionRoom` instance per active
  auction, hydrated from disk on demand.
- `/client` - Vite/React/TypeScript frontend. Landing page is now an auction-creation wizard
  instead of a menu of demo buttons; every other page is driven by URL params
  (`?room=&token=&view=&team=`), which is also how organiser/team/spectator links work.

## Getting started

```bash
npm install
npm run build      # compiles server (tsc) and client (tsc -b + vite build)
npm run dev         # server on :3001, client on :5173 (vite dev proxy forwards /api)
```

Open `http://localhost:5173`, fill in the auction-creation form, and you'll get an admin
link, one join link per team, a spectator link, and a broadcast/OBS link. **Save the admin
and team links when they're shown - they are not shown again.**

Auction data is stored in `server/data/auction.db` (SQLite). Back this file up like you would
any database if you're running a real tournament on it.

## CricHeroes featured-player integration (read before deploying)

Admins can attach a CricHeroes profile URL to a player (per-player field in the Admin
Console, or a `cricheroesUrl` column in the CSV import). The server then scrapes that
player's photo and stats in the background and caches them - they show up automatically on
a `FeaturedPlayerCard` wherever a player is "on the block" (Bidder Terminal, Spectator view,
Broadcast overlay, Admin console).

**This is important to understand before you rely on it:**

- **CricHeroes has no public API.** This confirmed via their privacy policy and general
  search - nothing official exists. What's implemented is an unofficial scraper
  (`server/src/cricheroesScraper.ts`), which is against the spirit of their Terms of Service
  and can break without warning if they change their site. That was a deliberate, informed
  call, not an oversight.
- **The scraper could not be verified against the real CricHeroes site.** It was built in a
  sandboxed environment where headless Chromium cannot launch (missing system libraries, no
  root access to install them). The code compiles and the failure paths are tested (see
  `smoke-test-part-d.js`), but nobody has confirmed it actually extracts the right photo/stats
  from a live page. **Before trusting this for a real auction**: run
  `npm run playwright:install --workspace=server` (downloads Chromium + system deps, needs
  root/sudo - won't work on every host), then trigger a sync from the Admin Console against a
  real player profile and check what comes back. If the stats/photo don't show up, the
  selectors at the top of `cricheroesScraper.ts` (`PHOTO_SELECTORS`,
  `STAT_BLOCK_SELECTOR_CANDIDATES`) are the only thing that should need editing - inspect the
  real page's DOM (browser devtools, right-click → Inspect on a stat) and update them to match.
- **Deployment needs headless Chromium support.** This adds real hosting weight compared to
  the rest of this app - budget at least ~512MB-1GB RAM for the server process, and make sure
  your host lets you run `playwright install --with-deps` during your build step (works on
  Railway/Render/Fly.io/a real VM; will NOT work on very constrained or serverless-style
  hosts). If that's not viable, the whole feature degrades gracefully - players without
  photos/stats just show a placeholder icon, and CricHeroes sync failures never affect live
  bidding (that isolation is what `smoke-test-part-d.js` proves).
- **It never runs during live bidding.** Sync only happens on CSV import (fire-and-forget,
  sequential so it doesn't launch a dozen browsers at once) or when an admin explicitly clicks
  sync. `SET_ACTIVE_PLAYER` / `PLACE_BID` / timers never touch the scraper - a slow or broken
  scrape can't stall an auction.

## What's new since the first MVP pass

- **CricHeroes featured-player card** - see the dedicated section above, it has real caveats
  worth reading before you demo this to a club.
- **Results export**: "Export Results" button (Admin Console and Spectator dashboard) downloads
  a CSV of every team's squad, sold prices, unsold players, and anything still unauctioned -
  generated client-side from already-synced state, no extra server route.
- **Analytics panel** (`client/src/components/AnalyticsPanel.tsx`, shown on both Admin and
  Spectator views): total spend, biggest buys, best-value picks (closest to base price),
  spend-by-role breakdown, and a purse-used bar per team.
- **Broadcast overlay polish**: player photo (with a fallback icon when no `photoUrl` is set),
  a reveal animation on the "on the block" card whenever the active player changes, and a
  "Recent Results" ticker showing the last 5 sold/unsold outcomes for viewers who just tuned in.
- **Rules-coverage test suite** (`smoke-test-part-c.js`): automated tests for bid validation
  (self-bidding, bidding below the current price, bidding beyond a team's purse - all must be
  rejected), undo, mark-unsold, and both RTM outcomes (accept and decline), all run over the
  real WebSocket protocol against a live server.

## Smoke tests (reliability + rules proof)

`server/scripts/smoke-test-part-a.js` through `-part-d.js` exercise the actual WebSocket
protocol end to end - nothing calls the state machine directly, everything goes through the
same connect/auth/message path a real browser would use.

- **Part A**: create a room, connect as admin/team/spectator, run a full bid → sold flow.
- **Part B**: run *after* the server process has been killed and restarted against the same
  data directory - confirms the sold player, price, and purse are still correct. This is the
  automated version of "prove the auction never loses a bid."
- **Part C**: bid validation edge cases, undo, mark-unsold, and both RTM outcomes.
- **Part D**: proves a CricHeroes sync failure (malformed URL, or a real launch/navigate
  failure) never crashes the server or blocks bidding on an unrelated room - it does NOT
  prove the scraper extracts correct data, since that couldn't be tested in this sandbox
  (see the CricHeroes section above).

```bash
cd server && npm run build
DATA_DIR=./data node --experimental-sqlite dist/index.js &
node scripts/smoke-test-part-a.js   # prints a line starting PART_A_OK <roomId> <playerId> <price> <teamId> <purse>
node scripts/smoke-test-part-c.js   # should end with PART_C_OK
node scripts/smoke-test-part-d.js   # should end with PART_D_OK
kill -9 %1                          # simulate a crash
DATA_DIR=./data node --experimental-sqlite dist/index.js &
node scripts/smoke-test-part-b.js <roomId> <playerId> <price> <teamId> <purse>   # should print PART_B_OK
```

## Known gaps / next steps (see PRD roadmap for the full picture)

- **CricHeroes scraper selectors are unverified against the live site** - the single most
  important open item if you're planning to actually use this feature. See the dedicated
  section above.
- **CSV import UX**: the parser validates rows and reports errors, but there's no UI table to
  review/fix bad rows before committing - it just reports counts.
- **No unit-level test framework** (Jest/Vitest) yet - the smoke tests are thorough
  integration coverage over the real protocol, but there's no fast in-process unit suite for
  the auction rules engine itself.
- **node:sqlite is still an experimental Node API.** It was chosen deliberately to avoid a
  native-module install step, which matters for shipping fast solo. If/when you need
  multi-instance scaling (per the architecture doc, not needed at pilot scale), migrate
  `server/src/db.ts` to Postgres - it's the only file that touches the database directly.
- **Player photos**: `photoUrl` is wired through the whole stack (including the new broadcast
  overlay image), but nothing uploads/hosts images yet - organisers have to supply an external
  URL per player via the CSV import.
- **WhatsApp-optimised share cards** and **regional language support** from the PRD's v2
  roadmap are not started.
