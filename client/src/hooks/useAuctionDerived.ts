import { useMemo } from 'react';
import type { AuctionState, Team } from './useAuction';

// Single source for the auction-math every screen used to re-derive by hand
// (BidderTerminal, AdminConsole, SpectatorView, BroadcastOverlay,
// TinderCardStack all independently typed "currentBid || basePrice" and a
// highestBidder lookup; BidderTerminal separately re-typed the increment-tier
// fallback and a hardcoded purse constant that drifted from the server).
// A rule change here - e.g. a minimum-increment floor - now touches one file
// instead of five.
//
// `teamId` is optional: pass it from a bidder's own screen (BidderTerminal)
// to get the team-specific fields (purse, spentPercent, canAfford,
// isBidDisabled). Screens with no "my team" concept (AdminConsole,
// SpectatorView, BroadcastOverlay) call this with no teamId and get `null`
// back for those fields rather than a wrong or meaningless value.

export interface AuctionDerived {
  /** currentBid if there's an active bid, otherwise the active player's base price. 0 if no active player. */
  effectiveBid: number;
  /** The team currently holding the highest bid, if any. */
  highestBidderTeam: Team | undefined;
  /** The next increment the server will accept from here - mirrors auctionRoom.ts's incrementFor() fallback exactly (last tier's increment, not a hardcoded value). */
  nextIncrement: number;
  /** effectiveBid + nextIncrement. */
  nextBidAmount: number;
  /** Whether `teamId` is the current highest bidder. Always false when no teamId given. */
  isHighestBidder: boolean;
  /** team.purse for `teamId`, or null when no teamId was given. */
  purse: number | null;
  /** team.originalPurse for `teamId`, or null when no teamId was given. */
  originalPurse: number | null;
  /** 0-100, or null when no teamId was given. */
  spentPercent: number | null;
  /** Whether `teamId`'s team can afford nextBidAmount, or null when no teamId was given. */
  canAfford: boolean | null;
  /** isHighestBidder || !canAfford || no active player. Null when no teamId was given - there's no "my bid button" state without a team. */
  isBidDisabled: boolean | null;
}

// Plain, dependency-free function - the actual computation. Exported and
// tested directly (see useAuctionDerived.test.ts) with no React rendering
// involved. The hook below is just a useMemo wrapper around it, so the
// component tree never recomputes this on every render.
export function computeAuctionDerived(auction: AuctionState, teamId?: string | null): AuctionDerived {
  const effectiveBid = auction.currentBid > 0 ? auction.currentBid : (auction.activePlayer?.basePrice || 0);
  const highestBidderTeam = auction.teams.find((t) => t.id === auction.highestBidder);
  const isHighestBidder = teamId != null && auction.highestBidder === teamId;

  const tiers = auction.rules.incrementTiers;
  const tier = tiers.find((t) => effectiveBid < t.upTo);
  const nextIncrement = tier ? tier.increment : tiers.length > 0 ? tiers[tiers.length - 1].increment : 5;
  const nextBidAmount = auction.currentBid === 0 ? effectiveBid : effectiveBid + nextIncrement;


  const team = teamId != null ? auction.teams.find((t) => t.id === teamId) : undefined;
  const purse = team ? team.purse : null;
  const originalPurse = team ? team.originalPurse : null;
  const spentPercent = team
    ? Math.min(100, Math.max(0, ((team.originalPurse - team.purse) / (team.originalPurse || 1)) * 100))
    : null;
  const canAfford = team ? team.purse >= nextBidAmount : null;
  const isBidDisabled = team ? isHighestBidder || !canAfford || !auction.activePlayer || auction.status === 'completed' : null;

  return {
    effectiveBid,
    highestBidderTeam,
    nextIncrement,
    nextBidAmount,
    isHighestBidder,
    purse,
    originalPurse,
    spentPercent,
    canAfford,
    isBidDisabled,
  };
}

export function useAuctionDerived(auction: AuctionState, teamId?: string | null): AuctionDerived {
  return useMemo(
    () => computeAuctionDerived(auction, teamId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auction.currentBid, auction.activePlayer, auction.teams, auction.highestBidder, auction.rules.incrementTiers, auction.status, teamId]
  );
}
