import React, { useState, useEffect, useRef } from 'react';
import { useAuction, Role } from '../hooks/useAuction';
import { useAuctionDerived } from '../hooks/useAuctionDerived';
import { PitchRoster } from '../components/PitchRoster';
import { FeaturedPlayerCard } from '../components/FeaturedPlayerCard';
import { TinderCardStack } from '../components/TinderCardStack';
import { AppShell } from '../components/AppShell';
import { AudioEngine } from '../components/AudioEngine';
import { Toast, ToastMessage } from '../components/ui/Toast';
import { WinCelebrationOverlay } from '../components/ui/WinCelebrationOverlay';
import {
  DollarSign,
  Users,
  Award,
  Flame,
  Zap,
  Crown,
  Smile,
  PieChart,
  Shield,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Check,
  AlertCircle,
  Layers,
  LayoutGrid,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UrgencyCountdownTimer } from '../components/animations/UrgencyCountdownTimer';

interface BidderTerminalProps {
  roomId: string;
  token?: string | null;
  role: Role;
  teamId?: string | null;
}

export const BidderTerminal: React.FC<BidderTerminalProps> = ({ roomId, token, role, teamId }) => {
  const auction = useAuction({ roomId, token, role, teamId });
  const [activeTab, setActiveTab] = useState<'squad' | 'pitch' | 'notes'>('squad');
  const [viewMode, setViewMode] = useState<'tactical' | 'deck'>('tactical');

  // Server-authoritative idempotent Win Celebration state
  const lastCelebratedLotIdRef = useRef<string | null>(null);
  const [winCelebration, setWinCelebration] = useState<{
    isOpen: boolean;
    playerName?: string;
    teamName?: string;
    amount?: number;
  } | null>(null);

  // Outbid transient alert state
  const previousLeaderIdRef = useRef<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Strategy notes backed by localStorage
  const storageKey = `bidder_notes_${roomId}_${teamId || 'anon'}`;
  const [budgetNotes, setBudgetNotes] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(storageKey) || '' : '';
  });

  const handleNotesChange = (val: string) => {
    setBudgetNotes(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, val);
    }
  };

  const team = auction.teams.find((t) => t.id === teamId);

  // Idempotent server-authoritative win celebration check
  useEffect(() => {
    if (!auction.biddingLog || auction.biddingLog.length === 0) return;
    const lastEntry = auction.biddingLog[auction.biddingLog.length - 1];
    if (
      lastEntry &&
      (lastEntry.type === 'sold' || lastEntry.type === 'rtm') &&
      lastEntry.teamId === teamId &&
      lastCelebratedLotIdRef.current !== lastEntry.id
    ) {
      lastCelebratedLotIdRef.current = lastEntry.id;
      setWinCelebration({
        isOpen: true,
        playerName: lastEntry.playerName,
        teamName: lastEntry.teamName,
        amount: lastEntry.amount,
      });
    }
  }, [auction.biddingLog, teamId]);

  // Outbid transient notification check
  useEffect(() => {
    if (
      previousLeaderIdRef.current === teamId &&
      auction.highestBidder &&
      auction.highestBidder !== teamId &&
      auction.activePlayer
    ) {
      const outbidTeam = auction.teams.find((t) => t.id === auction.highestBidder);
      setToast({
        id: Math.random().toString(),
        type: 'warning',
        message: `Outbid: ${outbidTeam ? outbidTeam.name : 'Another franchise'} placed bid for ${auction.currentBid} Lakhs`,
      });
      try {
        AudioEngine.playTimerTick();
      } catch {}
    }
    previousLeaderIdRef.current = auction.highestBidder;
  }, [auction.highestBidder, auction.currentBid, auction.activePlayer, teamId, auction.teams]);

  // Missing Link Guard
  if (!teamId || !token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[var(--bg-base)] text-[var(--text-primary)]">
        <div className="w-16 h-16 rounded-[16px] bg-[#ef4444]/15 border border-[#ef4444]/40 flex items-center justify-center text-[#ef4444] mb-4 shadow-xl">
          <Shield size={36} />
        </div>
        <h2 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-2">Invalid or Missing Team Access Link</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md leading-relaxed">
          This URL appears to be incomplete. Please contact the tournament auctioneer to obtain your private team franchise link.
        </p>
      </div>
    );
  }

  // All auction arithmetic comes from computeAuctionDerived / useAuctionDerived
  const derived = useAuctionDerived(auction, teamId);
  const currentVal = derived.effectiveBid;
  const highestBidderTeam = derived.highestBidderTeam;
  const isHighestBidder = derived.isHighestBidder;
  const purse = derived.purse ?? 0;
  const nextBidAmount = derived.nextBidAmount;
  const canAfford = derived.canAfford ?? false;
  const isBidDisabled = derived.isBidDisabled ?? true;
  const spent = (derived.originalPurse ?? purse) - purse;
  const spentPercent = derived.spentPercent ?? 0;

  const handlePlaceBid = (amount?: number) => {
    AudioEngine.init();
    AudioEngine.playBidSound();
    auction.placeBid(amount);
  };

  return (
    <AppShell
      name={auction.name}
      roomId={roomId}
      status={auction.status}
      connectionStatus={auction.connectionStatus}
      role={role}
      teamCode={team?.code}
      teamName={team?.name}
      lastError={auction.lastError}
      clearError={auction.clearError}
      reactionEmojiList={auction.reactionEmojiList}
    >
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 gap-4">
        {/* TOP PURSE TELEMETRY BAR (ALWAYS VISIBLE ABOVE THE FOLD) */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          {/* Franchise Identity */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[12px] bg-[var(--bg-base)] border border-[var(--accent-sky,#82C8E5)]/40 flex items-center justify-center font-mono font-black text-[var(--accent-sky,#82C8E5)] text-lg shadow-inner">
              {team?.code || 'TM'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-display font-bold text-[var(--text-primary)]">{team?.name}</h1>
                <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-primary)]/20 text-[var(--accent-sky,#82C8E5)] border border-[var(--border-subtle)] font-mono">
                  Cap: {derived.originalPurse} L
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Signed: <strong className="text-[var(--text-primary)]">{team?.players.length ?? 0} Players</strong> · Total Spent:{' '}
                <span className="font-mono text-[var(--text-primary)] font-bold tabular-nums">{spent} L</span>
              </p>
            </div>
          </div>

          {/* Runway Gauge & Remaining Purse Balance */}
          <div className="flex items-center gap-6">
            <div className="w-36 hidden sm:block">
              <div className="flex justify-between text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                <span>Budget Spent</span>
                <span className="font-mono tabular-nums">{spentPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--bg-base)] overflow-hidden border border-[var(--border-subtle)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-sky,#82C8E5)] transition-all duration-300"
                  style={{ width: `${spentPercent}%` }}
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-0.5">Remaining Purse</span>
              <div className="text-3xl font-black font-mono text-[var(--accent-sky,#82C8E5)] tracking-tight tabular-nums drop-shadow-[0_0_12px_rgba(130,200,229,0.25)]">
                {purse} <span className="text-sm font-sans font-bold text-[var(--text-secondary)]">L</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN TACTICAL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
          {/* CENTER STAGE: LIVE BIDDING COCKPIT (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* View Mode Toggle Header (Tactical vs Optional Deck Mode) */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {viewMode === 'tactical' ? 'Tactical Cockpit' : 'Card Deck View (Preview Mode)'}
              </span>
              <div className="flex bg-[var(--bg-surface)] p-0.5 rounded-[8px] border border-[var(--border-subtle)] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('tactical')}
                  className={`px-2.5 py-1 rounded-[6px] transition-colors flex items-center gap-1 ${
                    viewMode === 'tactical'
                      ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  <LayoutGrid size={12} />
                  <span>Tactical</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('deck')}
                  className={`px-2.5 py-1 rounded-[6px] transition-colors flex items-center gap-1 ${
                    viewMode === 'deck'
                      ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  <Layers size={12} />
                  <span>Deck View</span>
                </button>
              </div>
            </div>

            {/* Active Player Hero on the Block / Deck View */}
            {auction.activePlayer ? (
              viewMode === 'deck' ? (
                <TinderCardStack
                  activePlayer={auction.activePlayer}
                  upcomingPlayers={auction.players.filter((p) => p.status === 'available' && p.id !== auction.activePlayer?.id)}
                  currentBid={currentVal}
                  highestBidderTeam={highestBidderTeam}
                  onBid={() => handlePlaceBid(nextBidAmount)}
                  isBidDisabled={isBidDisabled}
                  disabledReason={!canAfford ? 'Purse Limit Reached' : undefined}
                />
              ) : (
                <FeaturedPlayerCard player={auction.activePlayer} size="large" />
              )
            ) : (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-8 text-center flex flex-col items-center justify-center text-[var(--text-secondary)] shadow-lg min-h-[220px]">
                <Clock size={36} className="mb-2 text-[var(--text-tertiary)] animate-pulse" />
                <h3 className="text-base font-display font-bold text-[var(--text-primary)] mb-1">Waiting for Next Player</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed">
                  The auctioneer will bring the next player to the block shortly. Check your squad balance on the right.
                </p>
              </div>
            )}

            {/* LIVE BID STATUS & THUMB BID TRIGGER */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 shadow-xl flex flex-col gap-4">
              {/* Bid & Leader Status Header */}
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-0.5">Active Bid</span>
                  <div className="text-2xl font-black font-mono text-[var(--text-primary)] tabular-nums">
                    {currentVal} <span className="text-sm font-sans font-normal text-[var(--text-secondary)]">Lakhs</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-0.5">Leading Franchise</span>
                  {highestBidderTeam ? (
                    <span className="font-bold text-sm text-[var(--accent-sky,#82C8E5)] flex items-center justify-end gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--status-success)] animate-pulse-subtle" />
                      <span className="text-[9px] font-mono font-bold text-[var(--status-success)] uppercase bg-[var(--status-success)]/15 px-1 py-0.5 rounded-[4px]">LIVE</span>
                      <span>{highestBidderTeam.name} ({highestBidderTeam.code})</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-tertiary)] italic">No bids yet</span>
                  )}
                </div>
              </div>

              {/* URGENCY COUNTDOWN TIMER (compact, for bidder situational awareness) */}
              {auction.activePlayer && (
                <div className="flex justify-center py-1">
                  <UrgencyCountdownTimer
                    seconds={auction.timer}
                    maxSeconds={15}
                    isActive={auction.timerActive}
                    size="normal"
                  />
                </div>
              )}

              {/* MASSIVE TACTILE ONE-TAP BID BUTTON (>= 56px height) */}
              <button
                disabled={isBidDisabled || auction.connectionStatus !== 'connected'}
                onClick={() => handlePlaceBid(nextBidAmount)}
                className={`w-full min-h-[56px] py-4 sm:py-5 px-6 rounded-[16px] font-black text-base sm:text-lg uppercase tracking-wider shadow-xl transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98] focus-ring ${
                  isHighestBidder
                    ? 'bg-[var(--bg-elevated)] text-[var(--status-success)] border border-[var(--status-success)]/40 cursor-not-allowed'
                    : !canAfford
                    ? 'bg-[var(--bg-elevated)] text-[var(--status-alert)] border border-[var(--status-alert)]/30 cursor-not-allowed'
                    : isBidDisabled
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] cursor-not-allowed'
                    : 'bg-[var(--accent-primary)] hover:bg-[#003888] text-white border border-[var(--accent-sky,#82C8E5)]/30 shadow-[0_4px_24px_rgba(0,71,171,0.45)]'
                }`}
              >
                {isHighestBidder ? (
                  <>
                    <Check size={20} className="text-[var(--status-success)] shrink-0" />
                    <span>You Hold Highest Bid ({currentVal} L)</span>
                  </>
                ) : !canAfford ? (
                  <>
                    <AlertCircle size={20} className="text-[var(--status-alert)] shrink-0" />
                    <span>Purse Limit Reached (Need {nextBidAmount}L)</span>
                  </>
                ) : auction.activePlayer ? (
                  <>
                    <Zap size={20} className="shrink-0 text-[var(--accent-sky,#82C8E5)]" />
                    <span>PLACE BID — {nextBidAmount} Lakhs</span>
                  </>
                ) : (
                  <>
                    <Clock size={18} className="shrink-0" />
                    <span>Waiting for Active Player...</span>
                  </>
                )}
              </button>

              {/* QUICK INCREMENT BUTTON PILLS */}
              <div>
                <span className="text-xs font-semibold text-[var(--text-secondary)] mb-2 block">
                  Tactical Increments
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 25, 50].map((inc) => {
                    const targetBid = currentVal + inc;
                    const isDisabled = isBidDisabled || purse < targetBid || auction.connectionStatus !== 'connected';
                    return (
                      <button
                        key={inc}
                        disabled={isDisabled}
                        onClick={() => handlePlaceBid(targetBid)}
                        className={`py-2.5 px-1.5 rounded-[12px] text-xs font-bold transition-all border flex flex-col items-center justify-center focus-ring ${
                          isDisabled
                            ? 'bg-[var(--bg-base)]/40 text-[var(--text-tertiary)] border-[var(--border-subtle)]/40 cursor-not-allowed'
                            : 'bg-[var(--bg-base)] text-[var(--accent-sky,#82C8E5)] border-[var(--border-subtle)] hover:border-[var(--accent-sky,#82C8E5)] hover:bg-[var(--bg-elevated)] active:scale-95'
                        }`}
                      >
                        <span className="font-bold">+{inc}L</span>
                        <span className="text-[10px] font-mono text-[var(--text-secondary)] tabular-nums">({targetBid}L)</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIVE REACTION BUTTONS BAR (Clean SVG Icons) */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Flame size={14} className="text-[var(--accent-sky,#82C8E5)]" /> Reaction:
                </span>
                <div className="flex gap-2">
                  {[
                    { id: 'flame', emoji: '🔥', label: 'Fire', Icon: Flame, color: 'text-amber-400' },
                    { id: 'money', emoji: '💰', label: 'Value', Icon: DollarSign, color: 'text-emerald-400' },
                    { id: 'shock', emoji: '😱', label: 'Shock', Icon: AlertCircle, color: 'text-rose-400' },
                    { id: 'zap', emoji: '⚡️', label: 'Surge', Icon: Zap, color: 'text-sky-400' },
                    { id: 'crown', emoji: '👑', label: 'Champion', Icon: Crown, color: 'text-amber-300' },
                  ].map(({ id, emoji, label, Icon, color }) => (
                    <button
                      key={id}
                      type="button"
                      title={label}
                      onClick={() => {
                        AudioEngine.init();
                        AudioEngine.playCheerSound();
                        auction.sendReaction(emoji);
                      }}
                      className="w-9 h-9 rounded-[10px] bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[var(--accent-sky,#82C8E5)]/50 hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-transform active:scale-90 focus-ring"
                    >
                      <Icon size={16} className={color} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANE: SQUAD ROSTER, PITCH MAP & STRATEGY NOTES (5 Cols) */}
          <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-4 shadow-xl flex flex-col h-[640px]">
            {/* TABS HEADER */}
            <div className="flex bg-[var(--bg-base)] rounded-[12px] p-1 border border-[var(--border-subtle)] mb-3 gap-1">
              <button
                onClick={() => setActiveTab('squad')}
                className={`flex-1 py-2 rounded-[8px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'squad'
                    ? 'bg-[var(--accent-primary)] text-white shadow'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Users size={13} /> Squad ({team?.players.length ?? 0})
              </button>
              <button
                onClick={() => setActiveTab('pitch')}
                className={`flex-1 py-2 rounded-[8px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'pitch'
                    ? 'bg-[var(--accent-primary)] text-white shadow'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Award size={13} /> Pitch Map
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-2 rounded-[8px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'notes'
                    ? 'bg-[var(--accent-primary)] text-white shadow'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <PieChart size={13} /> Strategy Notes
              </button>
            </div>

            {/* TAB 1: SQUAD ROSTER */}
            {activeTab === 'squad' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                  <span>Signed Player</span>
                  <span>Acquired Price</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {team?.players && team.players.length > 0 ? (
                    team.players.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-[12px] bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[var(--text-primary)]">{p.name}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">{p.role}</div>
                        </div>
                        <div className="font-mono font-bold text-[var(--accent-sky,#82C8E5)] tabular-nums">
                          {p.soldPrice} Lakhs
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--text-secondary)]">
                      <Users size={36} className="mb-2 text-[var(--text-tertiary)]" />
                      <p className="text-xs">No players acquired yet. Place bids to build your squad!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PITCH MAP */}
            {activeTab === 'pitch' && (
              <div className="flex-1 overflow-y-auto">
                <PitchRoster teamName={team?.name || 'My Squad'} players={team?.players || []} />
              </div>
            )}

            {/* TAB 3: STRATEGY WORKSHEET */}
            {activeTab === 'notes' && (
              <div className="flex-1 flex flex-col gap-2">
                <div className="text-xs text-[var(--text-secondary)] font-medium">
                  Private strategic target valuations (auto-saved to your browser):
                </div>
                <textarea
                  value={budgetNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Target Player Valuations:&#10;- Virat Kohli (Max: 240L)&#10;- Jasprit Bumrah (Max: 280L)&#10;- Hardik Pandya (Max: 180L)"
                  className="flex-1 w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] p-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent-sky,#82C8E5)] resize-none leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* P0 WIN CELEBRATION OVERLAY */}
      <WinCelebrationOverlay
        isOpen={!!winCelebration?.isOpen}
        playerName={winCelebration?.playerName}
        teamName={winCelebration?.teamName}
        amount={winCelebration?.amount}
        onClose={() => setWinCelebration(null)}
      />

      {/* FLOATING OUTBID & STATUS TOAST */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </AppShell>
  );
};

