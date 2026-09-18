import React, { useState, useMemo } from 'react';
import { useAuction, Role, Player } from '../hooks/useAuction';
import { useAuctionDerived } from '../hooks/useAuctionDerived';
import { AppShell } from '../components/AppShell';
import { TournamentSimulator } from '../components/TournamentSimulator';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { FeaturedPlayerCard } from '../components/FeaturedPlayerCard';
import { AudioEngine } from '../components/AudioEngine';
import { AIAuctioneer } from '../components/AIAuctioneer';
import { buildResultsCsv, downloadTextFile } from '../lib/csvExport';
import {
  Trophy,
  Download,
  Users,
  DollarSign,
  Activity,
  Flame,
  Search,
  Clock,
  ChevronRight,
  TrendingUp,
  BarChart3,
  ListOrdered,
  Play,
  Volume2,
  Award,
  Shield,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpectatorViewProps {
  roomId: string;
  token?: string | null;
  role: Role;
  teamId?: string | null;
}

type TabMode = 'arena' | 'analytics' | 'feed';

export const SpectatorView: React.FC<SpectatorViewProps> = ({ roomId, token, role, teamId }) => {
  const auction = useAuction({ roomId, token, role, teamId });
  const derived = useAuctionDerived(auction); // spectator - no "my team"

  const [activeTab, setActiveTab] = useState<TabMode>('arena');
  const [showSimulator, setShowSimulator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const highestBidderTeam = derived.highestBidderTeam;

  // Filtered teams & players for roster explorer
  const filteredTeams = useMemo(() => {
    return auction.teams.map((t) => {
      const filteredPlayers = t.players.filter((p) => {
        const matchesRole = roleFilter === 'all' || p.role.toLowerCase() === roleFilter.toLowerCase();
        const matchesSearch =
          !searchQuery.trim() ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.code.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRole && matchesSearch;
      });
      return {
        ...t,
        matchingPlayers: filteredPlayers,
      };
    });
  }, [auction.teams, searchQuery, roleFilter]);

  // Overall auction statistics
  const summaryStats = useMemo(() => {
    const totalPlayers = auction.players.length;
    const soldPlayers = auction.players.filter((p) => p.status === 'sold');
    const unsoldPlayers = auction.players.filter((p) => p.status === 'unsold');
    const totalSpent = soldPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
    const totalPurse = auction.teams.reduce((acc, t) => acc + t.originalPurse, 0);

    return {
      totalPlayers,
      soldCount: soldPlayers.length,
      unsoldCount: unsoldPlayers.length,
      availableCount: totalPlayers - soldPlayers.length - unsoldPlayers.length,
      totalSpent,
      totalPurse,
    };
  }, [auction.players, auction.teams]);

  // Last 5 events for live ticker
  const recentEvents = useMemo(() => {
    return [...auction.biddingLog].slice(-10).reverse();
  }, [auction.biddingLog]);

  // Last successful deal
  const lastSoldDeal = useMemo(() => {
    return [...auction.biddingLog].reverse().find((e) => e.type === 'sold' || e.type === 'rtm');
  }, [auction.biddingLog]);

  // Recent bids on currently active player
  const currentActiveBids = useMemo(() => {
    if (!auction.activePlayer) return [];
    return auction.biddingLog
      .filter((e) => e.playerId === auction.activePlayer?.id && e.type === 'bid')
      .slice(-5)
      .reverse();
  }, [auction.activePlayer, auction.biddingLog]);

  const handleExportCsv = () => {
    downloadTextFile(
      `${(auction.name || 'auction').replace(/[^a-z0-9]+/gi, '-')}-results.csv`,
      buildResultsCsv(auction)
    );
  };

  const reactionIcons = [
    { emoji: '🔥', label: 'Fire', Icon: Flame, color: 'text-amber-400' },
    { emoji: '🏏', label: 'Cricket', Icon: Award, color: 'text-sky-400' },
    { emoji: '💰', label: 'Cash', Icon: DollarSign, color: 'text-emerald-400' },
    { emoji: '⚡️', label: 'Surge', Icon: Activity, color: 'text-sky-300' },
    { emoji: '🏆', label: 'Trophy', Icon: Trophy, color: 'text-amber-300' },
  ];

  return (
    <AppShell
      name={auction.name}
      roomId={roomId}
      status={auction.status}
      connectionStatus={auction.connectionStatus}
      role={role}
      lastError={auction.lastError}
      clearError={auction.clearError}
      reactionEmojiList={auction.reactionEmojiList}
      latencyMs={auction.latencyMs}
      connectionQuality={auction.connectionQuality}
      onExportCsv={handleExportCsv}
    >
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* INTERACTIVE SPECTATOR BAR */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-3 sm:p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          {/* Left: View Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px]">
            <button
              onClick={() => setActiveTab('arena')}
              className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'arena'
                  ? 'bg-[var(--accent-primary)] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Users size={14} /> Arena &amp; Squads
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-[var(--accent-primary)] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <BarChart3 size={14} /> Analytics
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'feed'
                  ? 'bg-[var(--accent-primary)] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <ListOrdered size={14} /> Live Log
            </button>
          </div>

          {/* Center: Live Mood Reaction Icons */}
          <div className="flex items-center gap-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-[12px]">
            <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mr-1 hidden md:inline">
              React:
            </span>
            {reactionIcons.map(({ emoji, label, Icon, color }) => (
              <button
                key={emoji}
                type="button"
                onClick={() => auction.sendReaction(emoji)}
                className="w-8 h-8 rounded-[8px] hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-transform hover:scale-125 active:scale-95 focus-ring"
                title={`Cheer with ${label}`}
              >
                <Icon size={16} className={color} />
              </button>
            ))}
          </div>

          {/* Right: Tools & Playoff Simulation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSimulator(true)}
              className="px-3.5 py-2 rounded-[12px] bg-[var(--accent-primary)] hover:bg-[#003888] text-white font-black text-xs uppercase tracking-wider shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5 focus-ring border border-[var(--accent-sky,#82C8E5)]/30"
            >
              <Trophy size={14} /> Simulate Playoffs
            </button>
          </div>
        </section>

        {/* TOURNAMENT SIMULATOR MODAL */}
        {showSimulator && (
          <TournamentSimulator teams={auction.teams} onClose={() => setShowSimulator(false)} />
        )}

        {/* TAB 1: ARENA & SQUADS */}
        {activeTab === 'arena' && (
          <>
            {/* HERO BLOCK: ON THE BLOCK COLISEUM */}
            {auction.activePlayer ? (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-surface)] border-2 border-[var(--accent-sky,#82C8E5)]/40 rounded-[16px] p-6 sm:p-8 shadow-[0_0_50px_rgba(0,71,171,0.15)] relative overflow-hidden"
              >
                {/* Subtle background ambient blur */}
                <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-[var(--accent-primary)]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left: Featured Player Card */}
                  <div className="lg:col-span-7">
                    <div className="text-xs font-semibold text-[var(--accent-sky,#82C8E5)] mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--status-success)]/15 border border-[var(--status-success)]/30 text-[var(--status-success)] text-[10px] font-mono font-bold tracking-normal">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
                        LIVE
                      </span>
                      <span>On The Auction Block</span>
                    </div>
                    <FeaturedPlayerCard player={auction.activePlayer} size="large" />
                  </div>

                  {/* Right: Bidding Coliseum & Live Countdown */}
                  <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-4">
                    {/* Big Highest Bid Box */}
                    <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[16px] p-6 text-center shadow-inner relative overflow-hidden">
                      <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Current Highest Bid
                      </div>
                      <div className="text-5xl sm:text-6xl font-black font-mono text-[var(--accent-sky,#82C8E5)] tabular-nums my-1 drop-shadow-[0_0_20px_rgba(130,200,229,0.25)]">
                        {derived.effectiveBid} <span className="text-2xl font-sans text-[var(--text-secondary)]">L</span>
                      </div>

                      {/* Leading Bidder Badge */}
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)] font-medium">Leading:</span>
                        {highestBidderTeam ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[var(--accent-primary)]/20 border border-[var(--border-subtle)] text-[var(--accent-sky,#82C8E5)] font-bold text-sm">
                            <span className="w-2 h-2 rounded-full bg-[var(--status-success)] animate-pulse" />
                            <span>{highestBidderTeam.name}</span>
                            <span className="text-xs font-mono text-[var(--text-secondary)]">({highestBidderTeam.code})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)] italic font-semibold">
                            Awaiting opening bid (Base: {auction.activePlayer.basePrice}L)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Countdown Timer Indicator */}
                    {auction.timerActive && (
                      <div
                        className={`p-4 rounded-[16px] border flex items-center justify-between transition-colors ${
                          auction.timer <= 3
                            ? 'bg-rose-950/50 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                            : 'bg-[var(--bg-base)] border-[var(--border-subtle)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Clock
                            size={20}
                            className={auction.timer <= 3 ? 'text-rose-400 animate-bounce' : 'text-[var(--accent-sky,#82C8E5)]'}
                          />
                          <div>
                            <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                              Gavel Countdown
                            </div>
                            <div className="text-xs font-bold text-[var(--text-primary)]">
                              {auction.timer <= 3 ? 'FINAL CALL!' : 'Bidding in progress'}
                            </div>
                          </div>
                        </div>
                        <div className="text-3xl font-black font-mono text-[var(--accent-sky,#82C8E5)] tabular-nums">
                          {auction.timer}s
                        </div>
                      </div>
                    )}

                    {/* Recent Bids On Active Player */}
                    <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[16px] p-4">
                      <div className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider mb-2 flex items-center justify-between">
                        <span>Active Player Bid Chain</span>
                        <Activity size={12} className="text-[var(--accent-sky,#82C8E5)]" />
                      </div>
                      {currentActiveBids.length > 0 ? (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {currentActiveBids.map((b, idx) => (
                            <div
                              key={b.id || idx}
                              className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                            >
                              <span className="font-bold text-[var(--text-primary)] truncate max-w-[140px]">{b.teamName}</span>
                              <span className="font-mono font-bold text-[var(--accent-sky,#82C8E5)] tabular-nums">
                                {b.amount} L
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--text-tertiary)] italic text-center py-2">
                          No bids submitted yet for this player.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : (
              /* INTERMISSION / WAITING STATE */
              <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-8 text-center relative overflow-hidden shadow-xl">
                <div className="max-w-md mx-auto flex flex-col items-center">
                  <div className="w-16 h-16 rounded-[16px] bg-[var(--accent-primary)]/20 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-sky,#82C8E5)] mb-4">
                    <Clock size={32} />
                  </div>
                  <h2 className="text-xl font-display font-bold text-white mb-2">Auction Block In Recess</h2>
                  <p className="text-xs text-[var(--text-secondary)] mb-6">
                    Waiting for the auctioneer to place the next contender on the block. Review current team rosters
                    and purse standings below.
                  </p>

                  {/* Last Deal Spotlight */}
                  {lastSoldDeal && (
                    <div className="w-full bg-[var(--bg-base)] border border-[var(--status-success)]/30 rounded-[16px] p-4 text-left">
                      <div className="text-[10px] uppercase font-bold text-[var(--status-success)] tracking-wider mb-1 flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> Last Hammer Fall
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-black text-white">{lastSoldDeal.playerName}</span>
                        <span className="font-mono font-bold text-[var(--accent-sky,#82C8E5)] tabular-nums">
                          {lastSoldDeal.amount} L
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Acquired by <span className="font-bold text-[var(--accent-sky,#82C8E5)]">{lastSoldDeal.teamName}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SQUAD ROSTERS & LEADERBOARD HEADER + FILTERS */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
                <div>
                  <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                    <Users size={20} className="text-[var(--accent-sky,#82C8E5)]" /> Franchise Squads &amp; Purse Standings
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {auction.teams.length} Teams · {summaryStats.soldCount} Signed · {summaryStats.totalSpent} L Total Spend
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search player or team..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[12px] pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[var(--accent-sky,#82C8E5)] w-48 sm:w-60"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-1 rounded-[12px] text-xs">
                    {['all', 'batsman', 'bowler', 'all-rounder', 'wicket keeper'].map((rf) => (
                      <button
                        key={rf}
                        onClick={() => setRoleFilter(rf)}
                        className={`px-2.5 py-1 rounded-[8px] font-bold capitalize transition-colors ${
                          roleFilter === rf
                            ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                            : 'text-[var(--text-secondary)] hover:text-white'
                        }`}
                      >
                        {rf === 'all' ? 'All Roles' : rf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* TEAM CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredTeams.map((t) => {
                  const used = t.originalPurse - t.purse;
                  const pct = t.originalPurse > 0 ? Math.min(100, Math.round((used / t.originalPurse) * 100)) : 0;

                  return (
                    <div
                      key={t.id}
                      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-sky,#82C8E5)]/40 rounded-[16px] p-5 shadow-xl flex flex-col justify-between transition-all"
                    >
                      <div>
                        {/* Team Card Header */}
                        <div className="flex justify-between items-start mb-3 pb-3 border-b border-[var(--border-subtle)]">
                          <div className="min-w-0 pr-2">
                            <h3 className="font-display font-bold text-base text-white truncate" title={t.name}>
                              {t.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-[4px] bg-[var(--bg-base)] text-slate-300 border border-[var(--border-subtle)]">
                                {t.code}
                              </span>
                              {t.rtmCards > 0 && (
                                <span className="text-[10px] font-bold text-[var(--accent-sky,#82C8E5)]">
                                  {t.rtmCards} RTM
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black font-mono text-[var(--accent-sky,#82C8E5)] tabular-nums">
                              {t.purse} L
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] font-semibold">
                              {t.players.length} Signed
                            </div>
                          </div>
                        </div>

                        {/* Purse Progress Gauge */}
                        <div className="mb-4">
                          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] font-bold mb-1">
                            <span>Purse Utilization</span>
                            <span className="font-mono tabular-nums">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--bg-base)] overflow-hidden border border-[var(--border-subtle)]">
                            <div
                              className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-sky,#82C8E5)] transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Signed Players List */}
                        <div className="overflow-y-auto max-h-60 pr-1 space-y-2">
                          {t.matchingPlayers.length > 0 ? (
                            t.matchingPlayers.map((p) => (
                              <div
                                key={p.id}
                                className="p-2.5 rounded-[12px] bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-bold text-slate-200 truncate">{p.name}</div>
                                  <div className="text-[10px] font-semibold text-slate-400 capitalize">
                                    {p.role}
                                  </div>
                                </div>
                                <span className="font-mono font-bold text-[var(--accent-sky,#82C8E5)] tabular-nums shrink-0">
                                  {p.soldPrice} L
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-[var(--text-tertiary)] italic p-4 text-center">
                              {t.players.length === 0 ? 'No players acquired yet' : 'No players match filter'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Team Footer Pill Summary */}
                      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-semibold">
                        <span>Original: {t.originalPurse} L</span>
                        <span className="font-mono text-slate-400">{t.players.length} Squad Size</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* TAB 2: ANALYTICS INTELLIGENCE */}
        {activeTab === 'analytics' && (
          <section className="space-y-6">
            <AnalyticsPanel teams={auction.teams} players={auction.players} />
          </section>
        )}

        {/* TAB 3: COMPLETE LIVE BIDDING FEED */}
        {activeTab === 'feed' && (
          <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <ListOrdered size={18} className="text-[var(--accent-sky,#82C8E5)]" /> Auction Transaction Journal
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Reverse-chronological stream of all bids, hammer falls, and passes.
                </p>
              </div>
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 rounded-[12px] bg-[var(--accent-primary)] hover:bg-[#003888] text-xs font-bold text-white flex items-center gap-1.5 transition-colors border border-[var(--border-subtle)]"
              >
                <Download size={14} /> Download CSV
              </button>
            </div>

            {recentEvents.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {recentEvents.map((e) => (
                  <div
                    key={e.id}
                    className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          e.type === 'sold'
                            ? 'bg-emerald-400'
                            : e.type === 'unsold'
                            ? 'bg-rose-400'
                            : e.type === 'rtm'
                            ? 'bg-amber-400'
                            : 'bg-slate-500'
                        }`}
                      />
                      <div>
                        <span className="font-bold text-white">{e.playerName}</span>
                        <span className="text-[var(--text-tertiary)] ml-2">
                          {e.type === 'sold'
                            ? `Sold to ${e.teamName}`
                            : e.type === 'unsold'
                            ? 'Passed Unsold'
                            : e.type === 'rtm'
                            ? `RTM Claimed by ${e.teamName}`
                            : `Bid by ${e.teamName}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {e.amount > 0 && (
                        <div className="font-mono font-bold text-emerald-400 tabular-nums">
                          {e.amount} L
                        </div>
                      )}
                      <div className="text-[10px] text-[var(--text-tertiary)] font-mono">
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--text-tertiary)] italic p-8 text-center">
                No auction events logged yet.
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
};

