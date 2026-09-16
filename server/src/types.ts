// Single source of truth for the client<->server auction protocol.
// If you change a shape here, update client/src/hooks/useAuction.ts to match.

export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper';
export type PlayerStatus = 'available' | 'sold' | 'unsold';
export type RoomStatus = 'setup' | 'live' | 'paused' | 'completed';

export type CricheroesSyncStatus = 'none' | 'pending' | 'ok' | 'failed';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  basePrice: number; // lakhs
  photoUrl?: string;
  previousTeamCode?: string; // for RTM
  status: PlayerStatus;
  soldPrice?: number;
  teamId?: string;
  runs?: number;
  wickets?: number;
  average?: number;
  strikeRate?: number;
  economy?: number;
  matches?: number;
  // CricHeroes integration - see server/src/cricheroesScraper.ts for the
  // important caveats. Synced ahead of time (CSV import / admin-triggered),
  // never scraped live during bidding.
  cricheroesUrl?: string;
  cricheroesPhotoUrl?: string;
  cricheroesStats?: Record<string, string>;
  cricheroesStatus?: CricheroesSyncStatus;
  cricheroesSyncedAt?: number;
  cricheroesError?: string;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  purse: number;
  originalPurse: number;
  rtmCards: number;
  rosterIds: string[];
  token: string; // per-team join token (never sent to spectators/broadcast)
}

// What actually goes over the wire to clients (token stripped, roster populated)
export interface TeamWithPlayers {
  id: string;
  name: string;
  code: string;
  purse: number;
  originalPurse: number;
  rtmCards: number;
  players: Player[];
}

export interface BidLogEntry {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  amount: number;
  timestamp: number;
  type: 'bid' | 'rtm' | 'sold' | 'unsold';
}

export interface RtmState {
  pending: boolean;
  playerId: string;
  highestBidderId: string;
  highestBid: number;
  rtmTeamId: string;
}

export interface IncrementTier {
  upTo: number; // exclusive upper bound in lakhs, use a very large number for the last tier
  increment: number;
}

export interface AuctionRules {
  timerSeconds: number;
  rtmEnabled: boolean;
  incrementTiers: IncrementTier[];
}

export const DEFAULT_RULES: AuctionRules = {
  timerSeconds: 15,
  rtmEnabled: false,
  incrementTiers: [
    { upTo: 100, increment: 5 },
    { upTo: 200, increment: 10 },
    { upTo: 500, increment: 20 },
    { upTo: Number.MAX_SAFE_INTEGER, increment: 50 },
  ],
};

import { z } from 'zod';

export const ALLOWED_EMOJIS = ['👏', '🔥', '🏏', '💰', '😮', '🎉'] as const;

export const PlaceBidSchema = z.object({
  type: z.literal('PLACE_BID'),
  teamId: z.string().optional(),
  amount: z.number().positive().finite().optional(),
});

export const SetActivePlayerSchema = z.object({
  type: z.literal('SET_ACTIVE_PLAYER'),
  id: z.string().min(1),
});

export const StartTimerSchema = z.object({
  type: z.literal('START_TIMER'),
});

export const PauseTimerSchema = z.object({
  type: z.literal('PAUSE_TIMER'),
});

export const MarkSoldSchema = z.object({
  type: z.literal('MARK_SOLD'),
});

export const MarkUnsoldSchema = z.object({
  type: z.literal('MARK_UNSOLD'),
});

export const ExerciseRtmSchema = z.object({
  type: z.literal('EXERCISE_RTM'),
  accept: z.boolean(),
});

export const UndoActionSchema = z.object({
  type: z.literal('UNDO_ACTION'),
});

export const ResetSchema = z.object({
  type: z.literal('RESET'),
});

export const EndAuctionSchema = z.object({
  type: z.literal('END_AUCTION'),
});

export const ReactionSchema = z.object({
  type: z.literal('REACTION'),
  emoji: z.string().max(10).refine((e) => (ALLOWED_EMOJIS as readonly string[]).includes(e), {
    message: 'Invalid reaction emoji',
  }),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  PlaceBidSchema,
  SetActivePlayerSchema,
  StartTimerSchema,
  PauseTimerSchema,
  MarkSoldSchema,
  MarkUnsoldSchema,
  ExerciseRtmSchema,
  UndoActionSchema,
  ResetSchema,
  EndAuctionSchema,
  ReactionSchema,
]);

// Server -> client
export interface SyncMessage {
  type: 'SYNC';
  state: {
    roomId: string;
    name: string;
    status: RoomStatus;
    activePlayer: Player | null;
    currentBid: number;
    highestBidder: string | null;
    timer: number;
    timerActive: boolean;
    deadlineAt?: number | null;
    rtmState: RtmState | null;
    teams: TeamWithPlayers[];
    players: Player[];
    biddingLog: BidLogEntry[];
    undoAvailable: boolean;
    rules: AuctionRules;
  };
}

export interface ReactionMessage {
  type: 'REACTION';
  emoji: string;
}

export interface ErrorMessage {
  type: 'ERROR';
  message: string;
}

export type ServerMessage = SyncMessage | ReactionMessage | ErrorMessage;

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export type Role = 'admin' | 'team' | 'spectator';

export interface RoomSnapshot {
  roomId: string;
  name: string;
  status: RoomStatus;
  rules: AuctionRules;
  adminToken: string;
  teams: Team[];
  players: Player[];
  runtime: {
    activePlayerId: string | null;
    currentBid: number;
    currentBidderId: string | null;
    timer: number;
    timerActive: boolean;
    deadlineAt?: number | null;
    rtmState: RtmState | null;
    undoStack?: string[];
  };
  biddingLog: BidLogEntry[];
}

