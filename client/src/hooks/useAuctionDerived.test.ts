import { describe, it, expect } from 'vitest';
import { computeAuctionDerived } from './useAuctionDerived';
import type { AuctionState, Player, Team } from './useAuction';

// Minimal builders - only the fields useAuctionDerived actually reads are
// filled in meaningfully, everything else gets a harmless default. Keeps
// each test focused on the one thing it's checking.

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Test Player',
    role: 'Batsman',
    basePrice: 20,
    status: 'available',
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 't1',
    name: 'Team A',
    code: 'TA',
    purse: 1000,
    originalPurse: 1000,
    rtmCards: 0,
    players: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<AuctionState> = {}): AuctionState {
  return {
    roomId: 'room1',
    name: 'Test Auction',
    status: 'live',
    activePlayer: null,
    currentBid: 0,
    highestBidder: null,
    biddingLog: [],
    timer: 0,
    timerActive: false,
    rtmState: null,
    teams: [],
    players: [],
    undoAvailable: false,
    rules: { timerSeconds: 15, rtmEnabled: false, incrementTiers: [{ upTo: 100, increment: 5 }, { upTo: 9007199254740991, increment: 50 }] },
    ...overrides,
  };
}

describe('computeAuctionDerived', () => {
  it('no active player: effectiveBid is 0, nextBidAmount is just the fallback increment', () => {
    const state = makeState({ activePlayer: null, currentBid: 0 });
    const derived = computeAuctionDerived(state, null);

    expect(derived.effectiveBid).toBe(0);
    expect(derived.highestBidderTeam).toBeUndefined();
    expect(derived.isBidDisabled).toBeNull(); // no teamId given
  });

  it('past the last tier: falls back to the last tier\'s increment, matching auctionRoom.ts incrementFor()', () => {
    const state = makeState({
      activePlayer: makePlayer({ basePrice: 20 }),
      currentBid: 5000, // well past the only two tiers' upTo thresholds
    });
    const derived = computeAuctionDerived(state, null);

    expect(derived.effectiveBid).toBe(5000);
    expect(derived.nextIncrement).toBe(50); // last tier's increment, not a hardcoded 5
    expect(derived.nextBidAmount).toBe(5050);
  });

  it('empty tier list: falls back to 5 (matches the pre-fix default, never throws on an empty array)', () => {
    const state = makeState({
      activePlayer: makePlayer({ basePrice: 20 }),
      currentBid: 0,
      rules: { timerSeconds: 15, rtmEnabled: false, incrementTiers: [] },
    });
    const derived = computeAuctionDerived(state, null);

    expect(derived.nextIncrement).toBe(5);
  });

  it('no teamId (AdminConsole/SpectatorView/BroadcastOverlay): team-specific fields are null, not wrong', () => {
    const team = makeTeam({ id: 't1', purse: 500, originalPurse: 1000 });
    const state = makeState({
      teams: [team],
      activePlayer: makePlayer({ basePrice: 20 }),
      currentBid: 40,
      highestBidder: 't1',
    });
    const derived = computeAuctionDerived(state); // no teamId at all

    expect(derived.highestBidderTeam).toEqual(team); // room-level fields still work
    expect(derived.purse).toBeNull();
    expect(derived.originalPurse).toBeNull();
    expect(derived.spentPercent).toBeNull();
    expect(derived.canAfford).toBeNull();
    expect(derived.isBidDisabled).toBeNull();
    expect(derived.isHighestBidder).toBe(false); // no team to be the highest bidder
  });

  it('purse exactly at the next bid amount: canAfford is true (>=, not >)', () => {
    const team = makeTeam({ id: 't1', purse: 45, originalPurse: 1000 });
    const state = makeState({
      teams: [team],
      activePlayer: makePlayer({ basePrice: 20 }),
      currentBid: 40, // + 5 increment tier = nextBidAmount 45, exactly the purse
      rules: { timerSeconds: 15, rtmEnabled: false, incrementTiers: [{ upTo: 100, increment: 5 }] },
    });
    const derived = computeAuctionDerived(state, 't1');

    expect(derived.nextBidAmount).toBe(45);
    expect(derived.canAfford).toBe(true);
    expect(derived.isBidDisabled).toBe(false);
  });

  it('purse one short of the next bid amount: canAfford is false and the bid button is disabled', () => {
    const team = makeTeam({ id: 't1', purse: 44, originalPurse: 1000 });
    const state = makeState({
      teams: [team],
      activePlayer: makePlayer({ basePrice: 20 }),
      currentBid: 40,
      rules: { timerSeconds: 15, rtmEnabled: false, incrementTiers: [{ upTo: 100, increment: 5 }] },
    });
    const derived = computeAuctionDerived(state, 't1');

    expect(derived.canAfford).toBe(false);
    expect(derived.isBidDisabled).toBe(true);
  });

  it('purse gauge uses originalPurse, not a hardcoded 1000 (regression check for the fixed bug)', () => {
    const team = makeTeam({ id: 't1', purse: 4000, originalPurse: 5000 });
    const state = makeState({ teams: [team] });
    const derived = computeAuctionDerived(state, 't1');

    expect(derived.originalPurse).toBe(5000);
    expect(derived.spentPercent).toBe(20); // spent 1000 of 5000 = 20%, not 300% against a wrong 1000 baseline
  });

  it('the current highest bidder team is disabled from bidding again (cannot bid against yourself)', () => {
    const team = makeTeam({ id: 't1', purse: 1000, originalPurse: 1000 });
    const state = makeState({
      teams: [team],
      activePlayer: makePlayer({ basePrice: 20 }),
      currentBid: 40,
      highestBidder: 't1',
    });
    const derived = computeAuctionDerived(state, 't1');

    expect(derived.isHighestBidder).toBe(true);
    expect(derived.isBidDisabled).toBe(true);
  });

  it('disables bid button when auction status is completed', () => {
    const team = makeTeam({ id: 't1', purse: 1000, originalPurse: 1000 });
    const state = makeState({
      status: 'completed',
      teams: [team],
      activePlayer: makePlayer({ basePrice: 20 }),
      currentBid: 40,
      highestBidder: 'other_team',
    });
    const derived = computeAuctionDerived(state, 't1');

    expect(derived.isBidDisabled).toBe(true);
  });
});
