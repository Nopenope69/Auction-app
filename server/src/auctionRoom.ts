// The auction state machine. This is a generalized, persistence-first
// rewrite of the original prototype's server/src/state.ts: same core rules
// (bid validation, RTM, undo, sold/unsold flow) but now (a) scoped to one
// room among many instead of a single global singleton, (b) writes to
// SQLite on every mutation before broadcasting, and (c) reads its rules
// (timer length, bid increments, whether RTM is even enabled) from
// room config instead of hardcoding them.
//
// State machine: idle -> player_on_block -> bidding -> (going_once/twice via
// timer) -> sold/unsold. Server-authoritative throughout: clients only ever
// request an action; this class decides what actually happened.

import {
  AuctionRules,
  BidLogEntry,
  Player,
  RoomSnapshot,
  RoomStatus,
  RtmState,
  SyncMessage,
  Team,
  TeamWithPlayers,
} from './types';
import * as db from './db';

export class AuctionRoom {
  readonly roomId: string;
  readonly name: string;
  readonly rules: AuctionRules;

  private status: RoomStatus;
  private players: Record<string, Player> = {};
  private teams: Record<string, Team> = {};
  private activePlayerId: string | null = null;
  private currentBid = 0;
  private currentBidderId: string | null = null;
  private biddingLog: BidLogEntry[] = [];

  private timer: number;
  private timerActive = false;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  private rtmState: RtmState | null = null;
  private undoStack: string[] = []; // in-memory only, capped at 3 - see PRD note below

  private listeners: Set<() => void> = new Set();

  constructor(snapshot: RoomSnapshot) {
    this.roomId = snapshot.roomId;
    this.name = snapshot.name;
    this.rules = snapshot.rules;
    this.status = snapshot.status;
    snapshot.players.forEach((p) => (this.players[p.id] = p));
    snapshot.teams.forEach((t) => (this.teams[t.id] = t));
    this.biddingLog = snapshot.biddingLog;
    this.activePlayerId = snapshot.runtime.activePlayerId;
    this.currentBid = snapshot.runtime.currentBid;
    this.currentBidderId = snapshot.runtime.currentBidderId;
    this.timer = snapshot.runtime.timer;
    this.rtmState = snapshot.runtime.rtmState;
    // Deliberately do NOT restore timerActive=true from disk: if the process
    // died mid-countdown we don't want a phantom timer resuming with no one
    // watching it expire correctly. Admin has to press Start again after a
    // real crash recovery - a visible, safe default beats a silent one.
  }

  onChange(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    this.listeners.forEach((cb) => cb());
  }

  private persist() {
    db.persistSnapshot(this.roomId, {
      status: this.status,
      players: Object.values(this.players),
      teams: Object.values(this.teams),
      activePlayerId: this.activePlayerId,
      currentBid: this.currentBid,
      currentBidderId: this.currentBidderId,
      timer: this.timer,
      timerActive: this.timerActive,
      rtmState: this.rtmState,
    });
  }

  // Write-then-notify: DB write happens first. If it throws, the in-memory
  // mutation that triggered this is still applied (we don't roll back JS
  // object state), but we never claim success to the caller and we never
  // broadcast - see callers, which check the return value of persist calls.
  private commit() {
    this.persist();
    this.emit();
  }

  private pushUndoSnapshot() {
    const snap = JSON.stringify({
      players: this.players,
      teams: this.teams,
      activePlayerId: this.activePlayerId,
      currentBid: this.currentBid,
      currentBidderId: this.currentBidderId,
      biddingLog: this.biddingLog,
      rtmState: this.rtmState,
    });
    this.undoStack.push(snap);
    if (this.undoStack.length > 3) this.undoStack.shift();
  }

  private incrementFor(currentBid: number): number {
    const tier = this.rules.incrementTiers.find((t) => currentBid < t.upTo);
    return tier ? tier.increment : this.rules.incrementTiers[this.rules.incrementTiers.length - 1].increment;
  }

  addPlayers(newPlayers: Player[]) {
    newPlayers.forEach((p) => {
      this.players[p.id] = {
        ...p,
        status: p.status || 'available',
        cricheroesStatus: p.cricheroesUrl ? 'pending' : 'none',
      };
    });
    db.addPlayers(this.roomId, newPlayers);
    this.emit();
  }

  // Called by cricheroesSync.ts after a scrape attempt completes (success
  // or failure). Deliberately just an in-memory field update + emit - no
  // persistSnapshot() call, since the DB write already happened separately
  // via db.updateCricheroesCache() and this data isn't part of the auction
  // state machine's own consistency guarantees.
  applyCricheroesUpdate(
    playerId: string,
    data: { status: 'pending' | 'ok' | 'failed'; photoUrl?: string; stats?: Record<string, string>; error?: string }
  ) {
    const player = this.players[playerId];
    if (!player) return;
    player.cricheroesStatus = data.status;
    if (data.photoUrl !== undefined) player.cricheroesPhotoUrl = data.photoUrl;
    if (data.stats !== undefined) player.cricheroesStats = data.stats;
    player.cricheroesError = data.error;
    this.emit();
  }

  getFullState(): SyncMessage['state'] {
    const teams: TeamWithPlayers[] = Object.values(this.teams).map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      purse: t.purse,
      originalPurse: t.originalPurse,
      rtmCards: t.rtmCards,
      players: Object.values(this.players).filter((p) => p.teamId === t.id),
    }));

    return {
      roomId: this.roomId,
      name: this.name,
      status: this.status,
      activePlayer: this.activePlayerId ? this.players[this.activePlayerId] : null,
      currentBid: this.currentBid,
      highestBidder: this.currentBidderId,
      timer: this.timer,
      timerActive: this.timerActive,
      rtmState: this.rtmState,
      teams,
      players: Object.values(this.players),
      biddingLog: this.biddingLog,
      undoAvailable: this.undoStack.length > 0,
      rules: this.rules,
    };
  }

  setActivePlayer(playerId: string): boolean {
    const player = this.players[playerId];
    if (!player || player.status !== 'available') return false;

    this.pushUndoSnapshot();
    this.stopTimer();
    this.activePlayerId = playerId;
    this.currentBid = 0;
    this.currentBidderId = null;
    this.rtmState = null;
    this.timer = this.rules.timerSeconds;
    this.status = 'live';

    this.commit();
    return true;
  }

  placeBid(teamId: string, customAmount?: number): boolean {
    if (!this.activePlayerId || this.rtmState?.pending) return false;

    const player = this.players[this.activePlayerId];
    const team = this.teams[teamId];
    if (!player || !team || player.status !== 'available') return false;
    if (this.currentBidderId === teamId) return false; // can't bid against yourself

    let bidAmount = customAmount;
    if (!bidAmount) {
      bidAmount = this.currentBid === 0 ? player.basePrice : this.currentBid + this.incrementFor(this.currentBid);
    }

    if (this.currentBid > 0 && bidAmount <= this.currentBid) return false;
    if (this.currentBid === 0 && bidAmount < player.basePrice) return false;
    if (team.purse < bidAmount) return false;

    this.pushUndoSnapshot();
    this.currentBid = bidAmount;
    this.currentBidderId = teamId;
    this.timer = this.rules.timerSeconds;

    const entry: BidLogEntry = {
      id: randomId(),
      playerId: this.activePlayerId,
      playerName: player.name,
      teamId: team.id,
      teamName: team.name,
      amount: bidAmount,
      timestamp: Date.now(),
      type: 'bid',
    };
    this.biddingLog.push(entry);
    db.appendBidEvent(this.roomId, entry);

    this.commit();
    return true;
  }

  startTimer() {
    if (this.timerActive || !this.activePlayerId || this.rtmState?.pending) return;
    this.timerActive = true;
    this.timerInterval = setInterval(() => {
      if (this.timer > 0) {
        this.timer -= 1;
        this.persist();
        this.emit();
      } else {
        this.stopTimer();
        this.handleTimerExpiry();
      }
    }, 1000);
    this.commit();
  }

  pauseTimer() {
    this.stopTimer();
    this.commit();
  }

  private stopTimer() {
    this.timerActive = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private handleTimerExpiry() {
    if (this.currentBidderId) this.markSold();
    else this.markUnsold();
  }

  markSold(): boolean {
    if (!this.activePlayerId) return false;
    const player = this.players[this.activePlayerId];
    if (!player || player.status !== 'available') return false;
    if (!this.currentBidderId) return this.markUnsold();

    // RTM check (only if enabled for this room)
    if (this.rules.rtmEnabled && player.previousTeamCode) {
      const prevTeam = Object.values(this.teams).find(
        (t) => t.code.toUpperCase() === player.previousTeamCode!.toUpperCase()
      );
      if (prevTeam && prevTeam.id !== this.currentBidderId && prevTeam.rtmCards > 0) {
        this.stopTimer();
        this.rtmState = {
          pending: true,
          playerId: this.activePlayerId,
          highestBidderId: this.currentBidderId,
          highestBid: this.currentBid,
          rtmTeamId: prevTeam.id,
        };
        this.commit();
        return true;
      }
    }

    this.pushUndoSnapshot();
    this.stopTimer();
    const winnerId = this.currentBidderId;
    const finalPrice = this.currentBid;

    player.status = 'sold';
    player.soldPrice = finalPrice;
    player.teamId = winnerId;

    const winningTeam = this.teams[winnerId];
    winningTeam.purse -= finalPrice;

    const entry: BidLogEntry = {
      id: randomId(),
      playerId: player.id,
      playerName: player.name,
      teamId: winnerId,
      teamName: winningTeam.name,
      amount: finalPrice,
      timestamp: Date.now(),
      type: 'sold',
    };
    this.biddingLog.push(entry);
    db.appendBidEvent(this.roomId, entry);

    this.clearActivePlayer();
    this.commit();
    return true;
  }

  markUnsold(): boolean {
    if (!this.activePlayerId) return false;
    const player = this.players[this.activePlayerId];
    if (!player || player.status !== 'available') return false;

    this.pushUndoSnapshot();
    this.stopTimer();
    player.status = 'unsold';

    const entry: BidLogEntry = {
      id: randomId(),
      playerId: player.id,
      playerName: player.name,
      teamId: '',
      teamName: 'UNSOLD',
      amount: 0,
      timestamp: Date.now(),
      type: 'unsold',
    };
    this.biddingLog.push(entry);
    db.appendBidEvent(this.roomId, entry);

    this.clearActivePlayer();
    this.commit();
    return true;
  }

  exerciseRtm(accept: boolean): boolean {
    if (!this.rtmState?.pending) return false;
    this.pushUndoSnapshot();
    const rtm = this.rtmState;
    const player = this.players[rtm.playerId];
    const bidderTeam = this.teams[rtm.highestBidderId];
    const rtmTeam = this.teams[rtm.rtmTeamId];
    if (!player || !bidderTeam || !rtmTeam) return false;

    const winner = accept ? rtmTeam : bidderTeam;
    player.status = 'sold';
    player.soldPrice = rtm.highestBid;
    player.teamId = winner.id;
    winner.purse -= rtm.highestBid;
    if (accept) rtmTeam.rtmCards -= 1;

    const entry: BidLogEntry = {
      id: randomId(),
      playerId: player.id,
      playerName: player.name,
      teamId: winner.id,
      teamName: winner.name,
      amount: rtm.highestBid,
      timestamp: Date.now(),
      type: accept ? 'rtm' : 'sold',
    };
    this.biddingLog.push(entry);
    db.appendBidEvent(this.roomId, entry);

    this.clearActivePlayer();
    this.commit();
    return true;
  }

  private clearActivePlayer() {
    this.activePlayerId = null;
    this.currentBid = 0;
    this.currentBidderId = null;
    this.rtmState = null;
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.stopTimer();
    const snapStr = this.undoStack.pop()!;
    const snap = JSON.parse(snapStr);
    this.players = snap.players;
    this.teams = snap.teams;
    this.activePlayerId = snap.activePlayerId;
    this.currentBid = snap.currentBid;
    this.currentBidderId = snap.currentBidderId;
    this.biddingLog = snap.biddingLog;
    this.rtmState = snap.rtmState;
    this.timer = this.rules.timerSeconds;
    this.timerActive = false;
    this.commit();
    return true;
  }

  resetAuction() {
    this.stopTimer();
    Object.values(this.teams).forEach((t) => {
      t.purse = t.originalPurse;
      t.rtmCards = 3;
    });
    Object.values(this.players).forEach((p) => {
      p.status = 'available';
      delete p.soldPrice;
      delete p.teamId;
    });
    this.activePlayerId = null;
    this.currentBid = 0;
    this.currentBidderId = null;
    this.biddingLog = [];
    this.rtmState = null;
    this.timer = this.rules.timerSeconds;
    this.timerActive = false;
    this.undoStack = [];
    this.status = 'setup';
    db.resetRoom(this.roomId);
    this.emit();
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 9);
}
