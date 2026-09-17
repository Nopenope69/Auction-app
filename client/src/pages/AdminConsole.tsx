import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useAuction, Role } from '../hooks/useAuction';
import { useAuctionDerived } from '../hooks/useAuctionDerived';
import {
  Play,
  Pause,
  RotateCcw,
  Upload,
  Download,
  Link2,
  Loader2,
  Award,
  Gavel,
  Shield,
  Volume2,
  Plus,
  Trash2,
  Edit,
  Users,
  Flag,
  X,
  Check,
  Search,
  AlertTriangle,
  AlertCircle,
  Flame,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { buildResultsCsv, downloadTextFile } from '../lib/csvExport';
import { AppShell } from '../components/AppShell';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { FeaturedPlayerCard } from '../components/FeaturedPlayerCard';
import { AIAuctioneer } from '../components/AIAuctioneer';
import { SoldParticleExplosion } from '../components/animations/SoldParticleExplosion';
import { UrgencyCountdownTimer } from '../components/animations/UrgencyCountdownTimer';
import { InlineConfirm } from '../components/ui/InlineConfirm';
import { KeyboardShortcutModal } from '../components/ui/KeyboardShortcutModal';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminConsoleProps {
  roomId: string;
  token?: string | null;
  role: Role;
  teamId?: string | null;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ roomId, token, role, teamId }) => {
  const auction = useAuction({ roomId, token, role, teamId });
  const derived = useAuctionDerived(auction); // Admin has no "my team"
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search and role filter state for player pool
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper'>('All');
  const [mobileTab, setMobileTab] = useState<'queue' | 'deck' | 'radar'>('deck');
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  // Modals & confirmation states
  const [showTeamLinksModal, setShowTeamLinksModal] = useState(false);
  const [teamLinks, setTeamLinks] = useState<{ id: string; name: string; code: string; purse: number; token: string }[]>([]);
  const [teamLinksLoading, setTeamLinksLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState<string | null>(null);

  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [addPlayerForm, setAddPlayerForm] = useState({
    name: '',
    role: 'Batsman' as 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper',
    basePrice: 20,
    photoUrl: '',
    previousTeamCode: '',
  });

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerForm, setEditPlayerForm] = useState({ name: '', basePrice: 20 });

  const [cricheroesUrlDrafts, setCricheroesUrlDrafts] = useState<Record<string, string>>({});
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  // Filter available players
  const availablePlayers = useMemo(() => {
    return auction.players.filter((p) => {
      const isAvailable = p.status === 'available';
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesRole = roleFilter === 'All' || p.role.toLowerCase() === roleFilter.toLowerCase();
      return isAvailable && matchesSearch && matchesRole;
    });
  }, [auction.players, searchQuery, roleFilter]);

  const soldCount = useMemo(() => auction.players.filter((p) => p.status === 'sold').length, [auction.players]);
  const unsoldCount = useMemo(() => auction.players.filter((p) => p.status === 'unsold').length, [auction.players]);

  const [soldExplosionActive, setSoldExplosionActive] = useState(false);

  // Gavel action handlers
  const handleSold = () => {
    if (!auction.activePlayer) return;
    auction.markSold();
    setSoldExplosionActive(true);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  };

  const handleUnsold = () => {
    if (!auction.activePlayer) return;
    auction.markUnsold();
  };

  // Keyboard Shortcuts Hook with strict input guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcut trigger when user is typing in any text box or modal input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (showAddPlayerModal || showTeamLinksModal) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (auction.activePlayer) {
          if (auction.timerActive) auction.pauseTimer();
          else auction.startTimer();
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (auction.activePlayer && auction.status !== 'completed') {
          e.preventDefault();
          handleSold();
        }
      } else if (e.key === 'u' || e.key === 'U') {
        if (auction.activePlayer && auction.status !== 'completed') {
          e.preventDefault();
          handleUnsold();
        }
      } else if (e.key === 'z' || e.key === 'Z') {
        if (auction.undoAvailable) {
          e.preventDefault();
          auction.undoLastAction();
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setShowHotkeysModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [auction.activePlayer, auction.timerActive, auction.undoAvailable, auction.status, showAddPlayerModal, showTeamLinksModal]);

  // Team Links fetcher
  const handleFetchTeamLinks = async () => {
    setShowTeamLinksModal(true);
    setTeamLinksLoading(true);
    try {
      const res = await fetch(`/api/auctions/${roomId}/team-links`, {
        headers: { 'x-admin-token': token || '' },
      });
      const data = await res.json();
      if (res.ok) setTeamLinks(data.teams || []);
    } catch (e) {
      console.error('Failed to fetch team links', e);
    } finally {
      setTeamLinksLoading(false);
    }
  };

  // Add manual player
  const handleAddManualPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddPlayerError(null);
    if (!addPlayerForm.name.trim()) {
      setAddPlayerError('Player name is required.');
      return;
    }
    try {
      const res = await fetch(`/api/auctions/${roomId}/players/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token || '' },
        body: JSON.stringify(addPlayerForm),
      });
      if (res.ok) {
        setShowAddPlayerModal(false);
        setAddPlayerForm({ name: '', role: 'Batsman', basePrice: 20, photoUrl: '', previousTeamCode: '' });
      } else {
        const data = await res.json().catch(() => ({}));
        setAddPlayerError(data.error || 'Failed to add player to pool');
      }
    } catch (e: any) {
      setAddPlayerError(`Failed to add player: ${e.message}`);
    }
  };

  // Inline edit
  const handleStartEditPlayer = (p: { id: string; name: string; basePrice: number }) => {
    setEditingPlayerId(p.id);
    setEditPlayerForm({ name: p.name, basePrice: p.basePrice });
  };

  const handleSaveEditPlayer = async (playerId: string) => {
    try {
      await fetch(`/api/auctions/${roomId}/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token || '' },
        body: JSON.stringify(editPlayerForm),
      });
      setEditingPlayerId(null);
    } catch (e: any) {
      console.error(`Failed to update player: ${e.message}`);
    }
  };

  // Delete player (inline confirmed, non-blocking)
  const confirmDeletePlayer = async (playerId: string) => {
    try {
      await fetch(`/api/auctions/${roomId}/players/${playerId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token || '' },
      });
    } catch (e: any) {
      console.error(`Failed to delete player: ${e.message}`);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // End auction
  const handleEndAuction = () => {
    if (window.confirm('Finalize and lock this tournament auction? All bidding will be completed.')) {
      auction.endAuction();
    }
  };

  // Purge room
  const handlePurgeData = async () => {
    const confirmation = window.prompt('Type DELETE to permanently erase this room and all personal player data:');
    if (confirmation === 'DELETE') {
      try {
        const res = await fetch(`/api/auctions/${roomId}`, {
          method: 'DELETE',
          headers: { 'x-admin-token': token || '' },
        });
        if (res.ok) {
          alert('Room permanently erased.');
          window.location.href = '/';
        }
      } catch (e: any) {
        alert(`Failed to purge data: ${e.message}`);
      }
    }
  };

  // CSV upload
  const handleUpload = async (file: File) => {
    setUploadMsg('Uploading...');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`/api/auctions/${roomId}/players`, {
        method: 'POST',
        headers: { 'x-admin-token': token || '' },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadMsg(`Error: ${data.error || 'upload failed'}`);
        return;
      }
      const errCount = (data.errors || []).length;
      setUploadMsg(`Added ${data.count} players${errCount ? ` (${errCount} issues)` : ''}.`);
    } catch (e: any) {
      setUploadMsg(`Error: ${e.message}`);
    }
  };

  // CricHeroes Sync
  const syncOnePlayer = async (playerId: string, url: string) => {
    if (!url.trim()) return;
    setSyncingIds((prev) => new Set(prev).add(playerId));
    try {
      await fetch(`/api/auctions/${roomId}/players/${playerId}/sync-cricheroes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token || '' },
        body: JSON.stringify({ cricheroesUrl: url.trim() }),
      });
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(playerId);
        return next;
      });
    }
  };

  const syncAllCricheroes = async () => {
    await fetch(`/api/auctions/${roomId}/sync-cricheroes-all`, {
      method: 'POST',
      headers: { 'x-admin-token': token || '' },
    });
  };

  // Timer math
  const maxTimer = auction.rules?.timerSeconds || 15;
  const timerSeconds = auction.timer;
  const timerPercent = Math.max(0, Math.min(100, (timerSeconds / maxTimer) * 100));
  const isLastCall = timerSeconds <= 3 && timerSeconds > 0 && auction.timerActive;

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
      onOpenTeamLinks={handleFetchTeamLinks}
      onExportCsv={() => {
        const csv = buildResultsCsv(auction);
        downloadTextFile(`${(auction.name || 'auction').replace(/[^a-z0-9]+/gi, '-')}-results.csv`, csv);
      }}
      onEndAuction={handleEndAuction}
      onResetAuction={() => {
        if (window.confirm('Reset auction? All sales and bids will be wiped.')) auction.resetAuction();
      }}
      onPurgeData={handlePurgeData}
    >
      <SoldParticleExplosion
        active={soldExplosionActive}
        playerName={auction.activePlayer?.name}
        teamName={derived.highestBidderTeam?.name}
        amount={derived.effectiveBid}
        onComplete={() => setSoldExplosionActive(false)}
      />
      <div className="flex-1 flex flex-col p-3 sm:p-4 max-w-7xl w-full mx-auto gap-4">
        {/* AUCTION COMPLETED BANNER */}
        {auction.status === 'completed' && (
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--accent-sky,#82C8E5)]/40 text-[var(--text-primary)] flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <Award className="text-[var(--accent-sky,#82C8E5)] shrink-0" size={24} />
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">Tournament Auction Finalized</h2>
                <p className="text-xs text-[var(--text-secondary)]">All bidding operations are locked. Export the final official rosters below.</p>
              </div>
            </div>
            <button
              onClick={() => {
                const csv = buildResultsCsv(auction);
                downloadTextFile(`${(auction.name || 'auction').replace(/[^a-z0-9]+/gi, '-')}-results.csv`, csv);
              }}
              className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[#003888] text-white font-bold text-xs shadow-md transition-colors focus-ring"
            >
              Download Final Rosters CSV
            </button>
          </div>
        )}

        {/* RTM PENDING BANNER (FORMAL STATE MACHINE DISPLAY) */}
        {auction.rtmState?.pending && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-[16px] bg-[var(--bg-surface)] border-2 border-[var(--accent-sky,#82C8E5)]/50 shadow-2xl flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-[var(--accent-primary)]/20 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-sky,#82C8E5)] shrink-0 mt-0.5">
                <Award size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[var(--accent-sky,#82C8E5)] uppercase tracking-wider bg-[var(--accent-primary)]/20 px-2 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                    RTM_PENDING
                  </span>
                  <h3 className="text-sm font-display font-bold text-[var(--text-primary)]">
                    Right-to-Match Decision
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-lg leading-relaxed">
                  <strong className="text-[var(--text-primary)]">{auction.teams.find((t) => t.id === auction.rtmState?.rtmTeamId)?.name}</strong> has first option to match the winning gavel bid of{' '}
                  <span className="font-mono font-bold text-[var(--accent-sky,#82C8E5)]">{auction.rtmState?.highestBid ?? auction.currentBid} Lakhs</span> to retain{' '}
                  <strong className="text-[var(--text-primary)]">{auction.activePlayer?.name}</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                className="px-4 py-2.5 rounded-[12px] bg-[var(--status-success)] hover:brightness-110 text-[#030712] font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 focus-ring flex items-center gap-1.5"
                onClick={() => auction.exerciseRtm(true)}
              >
                <Check size={14} /> Match &amp; Retain ({auction.rtmState?.highestBid ?? auction.currentBid}L)
              </button>
              <button
                type="button"
                className="px-4 py-2.5 rounded-[12px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--status-alert)] border border-[var(--status-alert)]/40 font-black text-xs uppercase tracking-wider shadow transition-transform active:scale-95 focus-ring flex items-center gap-1.5"
                onClick={() => auction.exerciseRtm(false)}
              >
                <X size={14} /> Decline RTM
              </button>
            </div>
          </motion.div>
        )}

        {/* MOBILE VIEW SELECTOR TABS */}
        <div className="flex md:hidden bg-[var(--bg-surface)] rounded-[12px] p-1 border border-[var(--border-subtle)] gap-1">
          <button
            onClick={() => setMobileTab('deck')}
            className={`flex-1 py-2 rounded-[8px] text-xs font-bold transition-colors ${
              mobileTab === 'deck' ? 'bg-[var(--accent-primary)] text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Gavel Desk
          </button>
          <button
            onClick={() => setMobileTab('queue')}
            className={`flex-1 py-2 rounded-[8px] text-xs font-bold transition-colors ${
              mobileTab === 'queue' ? 'bg-[var(--accent-primary)] text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Player Queue ({availablePlayers.length})
          </button>
          <button
            onClick={() => setMobileTab('radar')}
            className={`flex-1 py-2 rounded-[8px] text-xs font-bold transition-colors ${
              mobileTab === 'radar' ? 'bg-[var(--accent-primary)] text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Purses &amp; Log
          </button>
        </div>

        {/* 3-COLUMN COMMAND CENTER GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
          {/* LEFT PANE: PLAYER POOL & QUEUE (3.5 Cols) */}
          <div
            className={`lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-4 flex flex-col h-[720px] shadow-xl ${
              mobileTab !== 'queue' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Header & Upload Controls */}
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-[var(--border-subtle)] gap-2">
              <div>
                <h2 className="text-sm font-display font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>Player Queue</span>
                  <span className="font-mono text-[var(--accent-sky,#82C8E5)] text-xs tabular-nums">({availablePlayers.length})</span>
                </h2>
                <div className="text-[10px] text-[var(--text-secondary)]">
                  {soldCount} sold · {unsoldCount} unsold
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[#003888] text-white font-bold text-xs flex items-center gap-1 transition-colors focus-ring"
                  onClick={() => setShowAddPlayerModal(true)}
                  title="Add player manually"
                >
                  <Plus size={12} /> Add
                </button>
                <button
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs flex items-center gap-1 transition-colors focus-ring"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload CSV player list"
                >
                  <Upload size={12} /> CSV
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
              </div>
            </div>

            {uploadMsg && <div className="text-xs text-[var(--accent-sky,#82C8E5)] mb-2 p-2 rounded-lg bg-[var(--accent-primary)]/20 border border-[var(--border-subtle)]">{uploadMsg}</div>}

            {/* Search Input */}
            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-sky,#82C8E5)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white text-xs"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Role Filter Pills */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1 text-[11px]">
              {(['All', 'Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
                    roleFilter === r
                      ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Scrollable Player List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {availablePlayers.map((p) => {
                const isEditing = editingPlayerId === p.id;
                return (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[var(--accent-sky,#82C8E5)]/40 transition-colors flex flex-col gap-1.5"
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-2 p-1">
                        <input
                          className="text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[8px] px-2 py-1 text-[var(--text-primary)] outline-none focus:border-[var(--accent-sky,#82C8E5)]"
                          value={editPlayerForm.name}
                          onChange={(e) => setEditPlayerForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Player Name"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-secondary)]">Base:</span>
                          <input
                            type="number"
                            className="w-16 text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[8px] px-2 py-1 text-[var(--text-primary)] outline-none focus:border-[var(--accent-sky,#82C8E5)] font-mono"
                            value={editPlayerForm.basePrice}
                            onChange={(e) => setEditPlayerForm((f) => ({ ...f, basePrice: Number(e.target.value) }))}
                          />
                          <span className="text-[10px] text-[var(--text-secondary)]">L</span>
                          <button
                            onClick={() => handleSaveEditPlayer(p.id)}
                            className="p-1 rounded-[6px] bg-[var(--status-success)] text-[#030712] font-bold"
                            title="Save"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditingPlayerId(null)}
                            className="p-1 rounded-[6px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold"
                            title="Cancel"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-[var(--text-primary)] truncate">{p.name}</div>
                          <div className="text-[10px] text-[var(--text-secondary)] font-medium">
                            {p.role} · <span className="font-mono text-[var(--accent-sky,#82C8E5)] font-semibold">{p.basePrice} L</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            className="p-1 rounded-[6px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                            onClick={() => handleStartEditPlayer(p)}
                            title="Edit player"
                          >
                            <Edit size={11} />
                          </button>
                          {confirmDeleteId === p.id ? (
                            <InlineConfirm
                              prompt="Delete?"
                              onConfirm={() => confirmDeletePlayer(p.id)}
                              onCancel={() => setConfirmDeleteId(null)}
                            />
                          ) : (
                            <button
                              type="button"
                              className="p-1 rounded-[6px] bg-[var(--status-alert)]/10 hover:bg-[var(--status-alert)]/20 text-[var(--status-alert)] transition-colors"
                              onClick={() => setConfirmDeleteId(p.id)}
                              title={`Delete ${p.name}`}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                          <button
                            className="px-2.5 py-1 rounded-[8px] bg-[var(--accent-primary)] hover:bg-[#003888] disabled:opacity-40 text-white font-black text-[11px] uppercase tracking-wider transition-transform active:scale-95 focus-ring"
                            disabled={!!auction.activePlayer || auction.status === 'completed'}
                            onClick={() => {
                              AIAuctioneer.announceNewPlayer(p.name, p.role, p.basePrice);
                              auction.setActivePlayer(p.id);
                              setMobileTab('deck');
                            }}
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CricHeroes link draft / quick sync */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
                      <input
                        placeholder="CricHeroes URL"
                        className="flex-1 text-[10px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[6px] px-2 py-0.5 text-[var(--text-secondary)] outline-none focus:border-[var(--accent-sky,#82C8E5)]"
                        defaultValue={p.cricheroesUrl || ''}
                        onChange={(e) => setCricheroesUrlDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      />
                      <button
                        className="p-1 rounded-[6px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                        disabled={syncingIds.has(p.id)}
                        onClick={() => syncOnePlayer(p.id, cricheroesUrlDrafts[p.id] ?? p.cricheroesUrl ?? '')}
                        title="Sync CricHeroes stats & photo"
                      >
                        {syncingIds.has(p.id) || p.cricheroesStatus === 'pending' ? (
                          <Loader2 size={10} className="animate-spin text-[var(--accent-sky,#82C8E5)]" />
                        ) : (
                          <Link2 size={10} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {availablePlayers.length === 0 && (
                <div className="text-center text-xs text-[var(--text-tertiary)] py-12">
                  No available players matching criteria.
                </div>
              )}
            </div>
          </div>

          {/* CENTER PANE: AUTHORITATIVE GAVEL STAGE (5.5 Cols) */}
          <div
            className={`lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-5 flex flex-col justify-between shadow-2xl h-[720px] ${
              mobileTab !== 'deck' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Stage Title */}
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[8px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-sky,#82C8E5)]">
                  <Gavel size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-display font-bold text-[var(--text-primary)] tracking-wide">Live Bidding Stage</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHotkeysModal(true)}
                className="text-[11px] font-mono text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 transition-colors focus-ring"
                title="View keyboard shortcuts cheatsheet"
              >
                <span>Hotkeys</span>
                <kbd className="px-1.5 py-0.5 rounded-[6px] bg-[var(--bg-base)] text-[10px] text-[var(--accent-sky,#82C8E5)] font-mono border border-[var(--border-subtle)] hover:border-[var(--accent-sky,#82C8E5)]/50 shadow-sm cursor-pointer">?</kbd>
              </button>
            </div>

            {auction.activePlayer ? (
              <div className="flex-1 flex flex-col justify-between py-3 gap-3">
                {/* Active Player Card */}
                <div>
                  <FeaturedPlayerCard player={auction.activePlayer} size="large" />
                </div>

                {/* CRITICAL OPERATIONAL LOOP: BID + LEADER + COUNTDOWN */}
                <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[16px] p-4 flex flex-col items-center justify-center text-center shadow-inner gap-2.5">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-0.5">
                      Authoritative Bid
                    </span>
                    <div className="text-4xl sm:text-5xl font-black font-mono text-[var(--accent-sky,#82C8E5)] tracking-tight tabular-nums drop-shadow-[0_0_15px_rgba(130,200,229,0.25)]">
                      {derived.effectiveBid} <span className="text-xl font-sans text-[var(--text-secondary)] font-bold">Lakhs</span>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                    <span>Highest Bidder:</span>
                    {derived.highestBidderTeam ? (
                      <span className="font-bold text-[var(--accent-sky,#82C8E5)] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--status-success)] animate-pulse-subtle" />
                        <span className="text-[9px] font-mono font-bold text-[var(--status-success)] uppercase bg-[var(--status-success)]/15 px-1 py-0.5 rounded-[4px]">LIVE</span>
                        <span>{derived.highestBidderTeam.name} ({derived.highestBidderTeam.code})</span>
                      </span>
                    ) : (
                      <span className="text-[var(--text-tertiary)] italic">Starting at Base Price</span>
                    )}
                  </div>

                  {/* Telemetry Countdown Timer */}
                  <UrgencyCountdownTimer
                    seconds={timerSeconds}
                    maxSeconds={maxTimer}
                    isActive={auction.timerActive}
                  />

                  {/* Timer Start/Pause Toggle */}
                  <div>
                    <button
                      onClick={() => {
                        if (auction.timerActive) auction.pauseTimer();
                        else auction.startTimer();
                      }}
                      className="px-5 py-1.5 rounded-[12px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] transition-colors flex items-center gap-2 focus-ring"
                    >
                      {auction.timerActive ? <Pause size={13} className="text-[var(--accent-sky,#82C8E5)]" /> : <Play size={13} className="text-[var(--accent-sky,#82C8E5)]" />}
                      <span>{auction.timerActive ? 'Pause Clock' : 'Start Clock'}</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-base)] text-[10px] font-mono text-[var(--text-secondary)] border border-[var(--border-subtle)]">[Space]</kbd>
                    </button>
                  </div>
                </div>

                {/* PHYSICAL GAVEL ACTION BUTTONS (ALWAYS VISIBLE ABOVE THE FOLD) */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={handleSold}
                    className="py-3 px-3 rounded-[12px] bg-[var(--status-success)] hover:brightness-110 active:scale-[0.98] text-[#030712] font-black text-xs uppercase tracking-wider shadow-lg flex flex-col items-center justify-center gap-1 focus-ring transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <Gavel size={15} />
                      <span>SOLD</span>
                    </div>
                    <kbd className="text-[10px] font-mono opacity-80">[S]</kbd>
                  </button>

                  <button
                    onClick={handleUnsold}
                    className="py-3 px-3 rounded-[12px] bg-[var(--status-alert)] hover:brightness-110 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider shadow-lg flex flex-col items-center justify-center gap-1 focus-ring transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <X size={15} />
                      <span>UNSOLD</span>
                    </div>
                    <kbd className="text-[10px] font-mono opacity-80">[U]</kbd>
                  </button>

                  <button
                    onClick={auction.undoLastAction}
                    disabled={!auction.undoAvailable}
                    className="py-3 px-3 rounded-[12px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] disabled:opacity-40 text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-1 focus-ring transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <RotateCcw size={15} />
                      <span>UNDO</span>
                    </div>
                    <kbd className="text-[10px] font-mono opacity-60">[Z]</kbd>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--text-secondary)]">
                <div className="w-14 h-14 rounded-[16px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-sky,#82C8E5)] mb-3 shadow-inner">
                  <Gavel size={28} />
                </div>
                <h3 className="text-base font-display font-bold text-[var(--text-primary)] mb-1">Gavel Stage Ready</h3>
                <p className="text-xs max-w-xs text-[var(--text-secondary)] leading-relaxed">
                  Select a player from the queue on the left to bring them onto the live bidding block.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT PANE: STREAM LOG & PURSE RADAR (2.5 Cols) */}
          <div
            className={`lg:col-span-3 flex flex-col gap-4 h-[720px] ${
              mobileTab !== 'radar' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* LIVE STREAM TICKER */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-4 flex flex-col h-1/2 shadow-xl">
              <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-[var(--border-subtle)]">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                  <Flame size={13} className="text-[var(--accent-sky,#82C8E5)]" />
                  <span>Auction Stream</span>
                </h3>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-ping" />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                {auction.biddingLog.length > 0 ? (
                  [...auction.biddingLog].reverse().slice(0, 20).map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-subtle)] flex justify-between items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[var(--text-primary)] truncate block">{log.playerName}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-medium">{log.teamName}</span>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs shrink-0 tabular-nums ${
                          log.type === 'sold'
                            ? 'text-[var(--status-success)]'
                            : log.type === 'unsold'
                            ? 'text-[var(--status-alert)]'
                            : 'text-[var(--accent-sky,#82C8E5)]'
                        }`}
                      >
                        {log.type === 'unsold' ? 'UNSOLD' : `${log.amount} L`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-[var(--text-secondary)] py-8 italic">No bids or outcomes recorded yet.</div>
                )}
              </div>
            </div>

            {/* TEAM PURSE RADAR */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-4 flex flex-col h-1/2 shadow-xl">
              <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-[var(--border-subtle)]">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-[var(--accent-sky,#82C8E5)]" />
                  <span>Purse Radar</span>
                </h3>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono font-bold">{auction.teams.length} Teams</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                {auction.teams.map((t) => {
                  const used = t.originalPurse - t.purse;
                  const pct = t.originalPurse > 0 ? Math.min(100, Math.round((used / t.originalPurse) * 100)) : 0;
                  return (
                    <div key={t.id} className="p-2 rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                      <div className="flex justify-between items-center font-semibold text-[var(--text-primary)] mb-1">
                        <span className="truncate max-w-[120px]" title={t.name}>{t.name}</span>
                        <span className="font-mono text-[var(--accent-sky,#82C8E5)] tabular-nums font-bold">{t.purse} L</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden mb-1">
                        <div
                          className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-sky,#82C8E5)] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                        <span>{t.players.length} signed</span>
                        <span>{pct}% spent</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* SECONDARY ANALYTICS (CLEANLY SEPARATED AT BOTTOM) */}
        <div className="mt-4">
          <AnalyticsPanel teams={auction.teams} players={auction.players} />
        </div>
      </div>

      {/* TEAM LINKS MODAL */}
      <AnimatePresence>
        {showTeamLinksModal && (
          <div className="fixed inset-0 z-50 bg-[#0b0a09]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-base">
                  <Users className="text-[var(--accent-sky,#82C8E5)]" size={20} />
                  <span className="font-display">Franchise Team Bidder Access Links</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTeamLinksModal(false)}
                  className="p-1 rounded-[6px] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors focus-ring"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                Send these private URLs to each team captain. Each link includes their capability token for placing live bids:
              </p>

              {teamLinksLoading ? (
                <div className="py-12 flex justify-center items-center text-[var(--text-secondary)] gap-2">
                  <Loader2 className="animate-spin text-[var(--accent-sky,#82C8E5)]" size={20} /> Loading franchise links...
                </div>
              ) : (
                <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-xs">
                  {teamLinks.map((t) => {
                    const teamUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}&view=bidder&token=${t.token}&team=${t.id}`;
                    return (
                      <div key={t.id} className="p-3 bg-[var(--bg-base)] rounded-[12px] border border-[var(--border-subtle)] flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[var(--text-primary)]">{t.name} ({t.code})</span>
                          <span className="font-mono text-[var(--accent-sky,#82C8E5)] tabular-nums font-bold">Purse: {t.purse} L</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={teamUrl}
                            className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-2.5 py-1.5 text-[var(--text-secondary)] font-mono text-[11px] outline-none"
                            onFocus={(e) => e.target.select()}
                          />
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(teamUrl)}
                            className="px-3 py-1.5 rounded-[8px] bg-[var(--accent-primary)] hover:bg-[#003888] text-white font-semibold text-xs focus-ring border border-[var(--border-subtle)] transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD MANUAL PLAYER MODAL */}
      <AnimatePresence>
        {showAddPlayerModal && (
          <div className="fixed inset-0 z-50 bg-[#0b0a09]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 max-w-md w-full shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-base">
                  <Plus className="text-[var(--accent-sky,#82C8E5)]" size={18} />
                  <span className="font-display">Add Player to Auction Pool</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPlayerModal(false);
                    setAddPlayerError(null);
                  }}
                  className="p-1 rounded-[6px] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors focus-ring"
                >
                  <X size={16} />
                </button>
              </div>

              {addPlayerError && (
                <div role="alert" className="mb-4 p-2.5 rounded-[8px] bg-[var(--status-alert)]/15 border border-[var(--status-alert)]/30 text-[var(--status-alert)] text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{addPlayerError}</span>
                </div>
              )}

              <form onSubmit={handleAddManualPlayer} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Player Name *</label>
                  <input
                    required
                    value={addPlayerForm.name}
                    onChange={(e) => setAddPlayerForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[8px] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent-sky,#82C8E5)]"
                    placeholder="e.g. Virat Kohli"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">Role</label>
                    <select
                      value={addPlayerForm.role}
                      onChange={(e) => setAddPlayerForm((f) => ({ ...f, role: e.target.value as any }))}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[8px] px-3 py-2 text-[var(--text-primary)] outline-none"
                    >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="Wicketkeeper">Wicketkeeper</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">Base Price (Lakhs) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={addPlayerForm.basePrice}
                      onChange={(e) => setAddPlayerForm((f) => ({ ...f, basePrice: Number(e.target.value) }))}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[8px] px-3 py-2 text-[var(--text-primary)] outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Previous Franchise Code (for RTM)</label>
                  <input
                    value={addPlayerForm.previousTeamCode}
                    onChange={(e) => setAddPlayerForm((f) => ({ ...f, previousTeamCode: e.target.value.toUpperCase() }))}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[8px] px-3 py-2 text-[var(--text-primary)] outline-none font-mono"
                    placeholder="e.g. RCB, CSK, MI"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Photo URL (Optional)</label>
                  <input
                    value={addPlayerForm.photoUrl}
                    onChange={(e) => setAddPlayerForm((f) => ({ ...f, photoUrl: e.target.value }))}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[8px] px-3 py-2 text-[var(--text-primary)] outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPlayerModal(false);
                      setAddPlayerError(null);
                    }}
                    className="px-4 py-2 rounded-[8px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-white font-semibold border border-[var(--border-subtle)] transition-colors focus-ring"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-[8px] bg-[var(--accent-primary)] hover:bg-[#003888] text-white font-black uppercase tracking-wider focus-ring shadow-md transition-colors"
                  >
                    Add Player
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KEYBOARD SHORTCUTS CHEATSHEET MODAL */}
      <KeyboardShortcutModal
        isOpen={showHotkeysModal}
        onClose={() => setShowHotkeysModal(false)}
      />
    </AppShell>
  );
};

