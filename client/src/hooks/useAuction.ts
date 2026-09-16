import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioEngine } from '../components/AudioEngine';
import { AIAuctioneer } from '../components/AIAuctioneer';

// This hook is the client half of the protocol defined in
// server/src/types.ts. It was rewritten from the original prototype: the
// old version listened for a message type ('SYNC') and sent action types
// (PLACE_BID, SET_ACTIVE_PLAYER, ...) that the old server never actually
// implemented (it spoke 'state_update' / 'place_bid' instead), so a bid
// placed in the UI never reached the auction engine. The server has been
// rewritten to speak this hook's protocol instead of the other way around,
// since this hook's shape is what every page component already consumes.

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'unauthorized' | 'not_found';
export type Role = 'admin' | 'team' | 'spectator';


export interface Player {
  id: string;
  name: string;
  role: string;
  basePrice: number;
  photoUrl?: string;
  previousTeamCode?: string;
  status: 'available' | 'sold' | 'unsold';
  soldPrice?: number;
  teamId?: string;
  // Organizer-entered career stats (from CSV import columns)
  runs?: number;
  wickets?: number;
  average?: number;
  strikeRate?: number;
  economy?: number;
  matches?: number;
  // CricHeroes integration - synced ahead of time by an admin action, never
  // fetched live during bidding. See server/src/cricheroesScraper.ts for
  // the unofficial/unverified caveats before trusting this data.
  cricheroesUrl?: string;
  cricheroesPhotoUrl?: string;
  cricheroesStats?: Record<string, string>;
  cricheroesStatus?: 'none' | 'pending' | 'ok' | 'failed';
  cricheroesError?: string;
}

export interface Team {
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
  upTo: number;
  increment: number;
}

export interface AuctionRules {
  timerSeconds: number;
  rtmEnabled: boolean;
  incrementTiers: IncrementTier[];
}

export interface Reaction {
  id: string;
  emoji: string;
  x: number;
  timestamp: number;
}

export interface AuctionErrorEvent {
  message: string;
  id: number;
}

export interface AuctionState {
  roomId: string;
  name: string;
  status: 'setup' | 'live' | 'paused' | 'completed';
  activePlayer: Player | null;
  currentBid: number;
  highestBidder: string | null;
  biddingLog: BidLogEntry[];
  timer: number;
  timerActive: boolean;
  deadlineAt?: number | null;
  rtmState: RtmState | null;
  teams: Team[];
  players: Player[];
  undoAvailable: boolean;
  rules: AuctionRules;
}

export interface UseAuctionParams {
  roomId: string | null;
  token?: string | null;
  role: Role;
  teamId?: string | null;
}

const EMPTY_STATE: AuctionState = {
  roomId: '',
  name: '',
  status: 'setup',
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
  rules: { timerSeconds: 15, rtmEnabled: false, incrementTiers: [] },
};

function wsUrl(roomId: string, role: Role, token?: string | null, teamId?: string | null): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // In Vite dev mode the client runs on :5173 and the server on :3001;
  // in production both are served from the same origin.
  const isDev = Boolean((import.meta as any).env?.DEV);
  const host = isDev ? `${window.location.hostname}:3001` : window.location.host;
  const params = new URLSearchParams({ room: roomId, role });
  if (token) params.set('token', token);
  if (teamId) params.set('teamId', teamId);
  return `${proto}://${host}/?${params.toString()}`;
}

export const useAuction = ({ roomId, token, role, teamId }: UseAuctionParams) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [state, setState] = useState<AuctionState>(EMPTY_STATE);
  const [reactionEmojiList, setReactionEmojiList] = useState<Reaction[]>([]);
  const [lastError, setLastError] = useState<AuctionErrorEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const prevRef = useRef<AuctionState>(EMPTY_STATE);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!roomId) return;
    setConnectionStatus('connecting');
    const ws = new WebSocket(wsUrl(roomId, role, token, teamId));
    wsRef.current = ws;

    ws.onopen = () => setConnectionStatus('connected');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SYNC') {
          const newState: AuctionState = data.state;
          const prev = prevRef.current;

          if (newState.activePlayer?.id !== prev.activePlayer?.id && newState.activePlayer) {
            AIAuctioneer.announceNewPlayer(newState.activePlayer.name, newState.activePlayer.role, newState.activePlayer.basePrice);
          }
          if (prev.activePlayer && !newState.activePlayer) {
            const lastEntry = newState.biddingLog[newState.biddingLog.length - 1];
            if (lastEntry && (lastEntry.type === 'sold' || lastEntry.type === 'rtm')) {
              AudioEngine.playSoldSound();
              AIAuctioneer.announceSold(lastEntry.playerName, lastEntry.teamName, lastEntry.amount);
            } else if (lastEntry && lastEntry.type === 'unsold') {
              AIAuctioneer.announceUnsold(lastEntry.playerName);
            }
          }
          if (newState.currentBid > prev.currentBid) {
            AudioEngine.playBidSound();
            const biddingTeam = newState.teams.find((t) => t.id === newState.highestBidder);
            if (biddingTeam) AIAuctioneer.announceBid(biddingTeam.name, newState.currentBid);
          }
          if (prev.timer !== newState.timer) {
            if (newState.timer > 2 && newState.timer <= 10) {
              AudioEngine.playTimerTick();
            } else if (newState.timer > 0 && newState.timer <= 2) {
              AudioEngine.playTimerUrgent();
              AIAuctioneer.announceCountdown(newState.timer);
            }
          }

          prevRef.current = newState;
          setState(newState);
        } else if (data.type === 'REACTION') {
          setReactionEmojiList((prev) => [
            ...prev,
            { id: Math.random().toString(), emoji: data.emoji, x: Math.random() * 80 + 10, timestamp: Date.now() },
          ]);
        } else if (data.type === 'ERROR') {
          // Server rejected the last mutation this client sent (stale bid,
          // insufficient purse, nothing to undo, etc). Every screen's own
          // client-side legality checks (canAfford/isBidDisabled and
          // friends) are a preview, not a guarantee - this is the only path
          // by which a real rejection ever reaches the user instead of the
          // button just silently doing nothing.
          setLastError({ message: data.message, id: Date.now() });
        }
      } catch (e) {
        console.error('Failed to parse message', e);
      }
    };

    ws.onclose = (event) => {
      if (event.code === 4001) {
        setConnectionStatus('unauthorized');
        setLastError({
          message: 'Access Denied: Invalid or unauthorized token. Please check your private link.',
          id: Date.now(),
        });
        return;
      }
      if (event.code === 4004) {
        setConnectionStatus('not_found');
        setLastError({
          message: 'Auction Not Found: This auction does not exist or has been deleted.',
          id: Date.now(),
        });
        return;
      }
      setConnectionStatus('disconnected');
      reconnectTimer.current = setTimeout(connect, 2500);
    };
    ws.onerror = () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, role, token, teamId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setReactionEmojiList((prev) => prev.filter((r) => now - r.timestamp < 3000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastError) return;
    const timeout = setTimeout(() => {
      setLastError((current) => (current?.id === lastError.id ? null : current));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [lastError]);

  const send = (msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn('Cannot send message, WebSocket not connected');
    }
  };

  return {
    connectionStatus,
    ...state,
    reactionEmojiList,
    lastError,
    clearError: () => setLastError(null),
    placeBid: (amount?: number) => send({ type: 'PLACE_BID', teamId, amount }),
    sendReaction: (emoji: string) => send({ type: 'REACTION', emoji }),
    setActivePlayer: (id: string) => send({ type: 'SET_ACTIVE_PLAYER', id }),
    startTimer: () => send({ type: 'START_TIMER' }),
    pauseTimer: () => send({ type: 'PAUSE_TIMER' }),
    markSold: () => send({ type: 'MARK_SOLD' }),
    markUnsold: () => send({ type: 'MARK_UNSOLD' }),
    undoLastAction: () => send({ type: 'UNDO_ACTION' }),
    exerciseRtm: (accept: boolean) => send({ type: 'EXERCISE_RTM', accept }),
    resetAuction: () => send({ type: 'RESET' }),
    endAuction: () => send({ type: 'END_AUCTION' }),
  };
};

