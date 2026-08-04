# Session Summary — 2026-08-04 — Cricket Auction Platform

## What we built

- **`GAUNTLET.md`** — lead prompt for the `gauntlet-loop` skill, grounded in the real repo
  (`github.com/Nopenope69/Auction-app`). Goal: refine the UI to feel like "Tinder met a live
  auction house" while leaving `server/` and the WebSocket protocol untouched. User ran it
  externally (Claude Code/Codex); it added `TinderCardStack.tsx`, `FloatingReactions.tsx`, and
  rewrote most screens. Its own `progress.json` self-reports 9/9 "won" — worth some
  skepticism, it's the builder loop grading itself.
- **Architecture review** (`improve-codebase-architecture` skill) against the post-gauntlet
  code found 5 candidates (A–E). A, B, C were Strong; B and C got fixed in the debug pass; A
  was picked for the grilling loop (below); D (dead swipe-left "Pass") and E (fabricated
  `rating` field) are still open.
- **Debug pass** (`engineering:debug`) fixed 4 correctness bugs — verified via tsc, the smoke
  tests, and a live WebSocket check: hardcoded 1000L purse constant, client/server
  increment-tier fallback mismatch, AdminConsole narrating sold/unsold before server
  confirmation (could contradict RTM outcomes), and the dead `ERROR` protocol message (every
  rejected action failed silently — now wired end-to-end with a dismissible banner).
- **Candidate A implemented** — collapsed the duplicated auction-math (effective bid,
  highest-bidder team, purse %, next increment) that was independently re-typed across 5
  files into one module:
  - **`client/src/hooks/useAuctionDerived.ts`** — `computeAuctionDerived()` is a plain
    exported function (no React); the hook itself is a thin `useMemo` wrapper. Takes
    `auction` + optional `teamId`; team-specific fields (`purse`, `spentPercent`, `canAfford`,
    `isBidDisabled`) are `null` when no `teamId` is given (AdminConsole/SpectatorView/
    BroadcastOverlay), not a wrong guess.
  - **`useAuctionDerived.test.ts`** (8 cases) + **`vitest.config.ts`** — first unit-test
    coverage in the repo. Kept separate from `vite.config.ts` because this repo pins a very
    new `vite@8` whose `Plugin` type doesn't structurally match vitest's own nested `vite`
    peer dependency.
  - Updated `BidderTerminal.tsx`, `AdminConsole.tsx`, `SpectatorView.tsx`,
    `BroadcastOverlay.tsx` to consume the hook; `TinderCardStack.tsx` dropped its own
    duplicate ternary since it now receives the already-resolved value as a prop.

## Key decisions made

- Selector lives as a **new hook** (`useAuctionDerived`), not folded into `useAuction.ts` —
  keeps `useAuction.ts` purely "the WebSocket protocol client."
- **One selector, full scope** (room-level + team-level fields together), not split into two
  modules.
- **No shared client/server package** for the increment-tier algorithm — accepted as
  duplication for now, centralized only on the client side.
- **Added Vitest** despite the README listing "no unit-test framework yet" as a known gap —
  this selector is the first genuinely pure, isolated piece of client logic in the codebase.
- Candidates D (dead "Pass" swipe) and E (fabricated `rating` field) were **deliberately left
  unfixed** — D is a product call, not a bug with one right answer; E was flagged but out of
  scope for the debug pass.

## State of the project

- Local clone lives at `~/Desktop/random/auction-app`, now connected directly to this Cowork
  session (no more zip/unzip/copy needed for future changes).
- 5 commits pushed to `origin/main`:
  `137e69f` gauntlet UI rewrite, `6f32ef8` purse/increment fix, `5bf9821` AdminConsole
  narration fix, `1c3519c` ERROR channel, `1820c92`/`1877b16` the `useAuctionDerived` selector.
  `git log --oneline -6` confirms all present.
- `npm run test --workspace=client` confirmed 8/8 passing on the user's own machine.
- The earlier "Create Auction" button issue was resolved (needed an auction name + 2 named
  teams filled in — `Landing.tsx`'s `canSubmit` gate).
- User said they'd do a full clickthrough of the live bidding flow — **status unknown, not
  yet confirmed done.**

## Next session: pick up here

1. **Clickthrough testing** — confirm the fixes hold up in practice: purse gauge on a
   non-default-purse room, increment pills past the last tier, RTM narration timing, the
   error banner on a rejected action.
2. **Candidates D and E** — still open. D needs a product decision (implement real swipe-left
   pass semantics, or remove the gesture); E (fabricated `rating` field in
   `TournamentSimulator` and `PitchRoster`) is a straightforward "remove the fake data or wire
   a real source" fix.
3. There's a stray `package-lock.json` diff in the working tree from a local `npm install` —
   harmless, but worth a `git checkout package-lock.json` or a clean commit before starting
   new work, so future diffs stay readable.

## Files to know about

- `GAUNTLET.md` (repo root) — lead prompt handed to the external gauntlet-loop run.
- `client/src/hooks/useAuctionDerived.ts` / `.test.ts` — Candidate A's implementation.
- This file (`docs/session-notes-2026-08-04.md`) — this handoff note.
