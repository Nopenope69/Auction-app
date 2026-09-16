import React, { useRef, useState } from 'react';
import { useAuction, Role } from '../hooks/useAuction';
import { useAuctionDerived } from '../hooks/useAuctionDerived';
import { Play, Pause, CheckCircle, XCircle, RotateCcw, Upload, RefreshCw, Download, Link2, Loader2, Award, Gavel, Shield, Sparkles, Volume2, Plus, Trash2, Edit, Users, Flag, X, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { buildResultsCsv, downloadTextFile } from '../lib/csvExport';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { FeaturedPlayerCard } from '../components/FeaturedPlayerCard';
import { AudioEngine } from '../components/AudioEngine';
import { AIAuctioneer } from '../components/AIAuctioneer';
import { FloatingReactions } from '../components/FloatingReactions';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminConsoleProps {
  roomId: string;
  token?: string | null;
  role: Role;
  teamId?: string | null;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ roomId, token, role, teamId }) => {
  const auction = useAuction({ roomId, token, role, teamId });
  const derived = useAuctionDerived(auction); // no teamId - admin has no "my team"
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  // Team Links modal state
  const [showTeamLinksModal, setShowTeamLinksModal] = useState(false);
  const [teamLinks, setTeamLinks] = useState<{ id: string; name: string; code: string; purse: number; token: string }[]>([]);
  const [teamLinksLoading, setTeamLinksLoading] = useState(false);

  // Manual Player Add modal state
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [addPlayerForm, setAddPlayerForm] = useState({
    name: '',
    role: 'Batsman' as 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper',
    basePrice: 20,
    photoUrl: '',
    previousTeamCode: '',
  });

  // Inline Player Edit state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerForm, setEditPlayerForm] = useState({ name: '', basePrice: 20 });

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

  const handleAddManualPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPlayerForm.name.trim()) return;
    try {
      const res = await fetch(`/api/auctions/${roomId}/players/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token || '' },
        body: JSON.stringify(addPlayerForm),
      });
      if (res.ok) {
        setShowAddPlayerModal(false);
        setAddPlayerForm({ name: '', role: 'Batsman', basePrice: 20, photoUrl: '', previousTeamCode: '' });
      }
    } catch (e: any) {
      alert(`Failed to add player: ${e.message}`);
    }
  };

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
      alert(`Failed to update player: ${e.message}`);
    }
  };

  const handleDeletePlayer = async (playerId: string, name: string) => {
    if (!window.confirm(`Delete player ${name} from pool?`)) return;
    try {
      await fetch(`/api/auctions/${roomId}/players/${playerId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token || '' },
      });
    } catch (e: any) {
      alert(`Failed to delete player: ${e.message}`);
    }
  };

  const handleEndAuction = () => {
    if (window.confirm('End this tournament auction? All bidding will be completed and locked.')) {
      auction.endAuction();
    }
  };

  const handlePurgeData = async () => {
    const confirmation = window.prompt('Type DELETE to permanently erase this room and all personal player data (DPDP compliance):');
    if (confirmation === 'DELETE') {
      try {
        const res = await fetch(`/api/auctions/${roomId}`, {
          method: 'DELETE',
          headers: { 'x-admin-token': token || '' },
        });
        if (res.ok) {
          alert('Auction room and all associated data permanently erased.');
          window.location.href = '/';
        }
      } catch (e: any) {
        alert(`Failed to purge data: ${e.message}`);
      }
    }
  };

  // Narration (sound + AI voice) is NOT triggered here. useAuction.ts
  // already announces sold/unsold once, off of the server's actual
  // outcome (see its SYNC diff handler) - not the admin's guess of what's
  // about to happen. Narrating here too used to double-fire, and would
  // announce "Sold to X" even when RTM enabled turned the click into a
  // pending Right-to-Match decision instead of a real sale.
  const handleSold = () => {
    auction.markSold();
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
  };

  const handleUnsold = () => {
    auction.markUnsold();
  };

  const availablePlayers = auction.players.filter((p) => p.status === 'available');

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
      setUploadMsg(`Added ${data.count} players${errCount ? ` (${errCount} rows had issues)` : ''}.`);
    } catch (e: any) {
      setUploadMsg(`Error: ${e.message}`);
    }
  };

  const broadcastLink = `${window.location.origin}${window.location.pathname}?room=${roomId}&view=broadcast`;
  const spectatorLink = `${window.location.origin}${window.location.pathname}?room=${roomId}&view=spectator`;

  const [cricheroesUrlDrafts, setCricheroesUrlDrafts] = useState<Record<string, string>>({});
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

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

  // Timer ring percentage calculation
  const maxTimer = auction.rules?.timerSeconds || 15;
  const timerPercent = Math.max(0, Math.min(100, (auction.timer / maxTimer) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col relative font-sans">
      <FloatingReactions reactions={auction.reactionEmojiList} />

      {/* Server-rejected action banner - undo with nothing to undo, RTM
          exercised with no pending decision, etc. See useAuction.ts /
          server/src/index.ts sendError for why this exists. */}
      <AnimatePresence>
        {auction.lastError && (
          <motion.div
            key={auction.lastError.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] px-4 py-3 rounded-2xl bg-rose-950/95 border border-rose-500/40 text-rose-100 text-sm font-semibold shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3"
          >
            <span>{auction.lastError.message}</span>
            <button
              onClick={() => auction.clearError()}
              className="shrink-0 text-rose-300 hover:text-white text-xs font-bold uppercase tracking-wider"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b border-[rgba(255,255,255,0.08)] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gavel className="text-amber-400" size={28} />
            <h1 className="text-3xl font-black text-white">{auction.name || 'Auction Control Deck'}</h1>
          </div>
          <div className="text-xs font-semibold text-slate-400 mt-1">
            Room Code: <span className="text-amber-400 font-mono font-bold">{roomId}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-[rgba(255,255,255,0.08)] text-xs font-semibold flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                auction.connectionStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
              }`}
            />
            WS Status: <span className="uppercase text-slate-200">{auction.connectionStatus}</span>
          </div>

          <button
            className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-400 transition-colors flex items-center gap-1.5"
            onClick={handleFetchTeamLinks}
            title="View and copy private team bidder URLs"
          >
            <Users size={14} /> Team Links
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-xs font-bold text-purple-300 transition-colors flex items-center gap-1.5"
            onClick={handleEndAuction}
            disabled={auction.status === 'completed'}
            title="Finalize and lock the tournament auction"
          >
            <Flag size={14} /> End Auction
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5"
            onClick={() => {
              const csv = buildResultsCsv(auction);
              downloadTextFile(`${(auction.name || 'auction').replace(/[^a-z0-9]+/gi, '-')}-results.csv`, csv);
            }}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5"
            onClick={syncAllCricheroes}
            title="Re-sync CricHeroes for every player"
          >
            <Link2 size={14} /> Sync CricHeroes
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-400 transition-colors flex items-center gap-1.5"
            onClick={() => {
              if (window.confirm('Reset the entire auction? All sales and bids will be cleared.')) auction.resetAuction();
            }}
          >
            <RefreshCw size={14} /> Reset
          </button>
          <button
            className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-xs font-bold text-rose-300 transition-colors flex items-center gap-1.5"
            onClick={handlePurgeData}
            title="DPDP compliance: Permanently erase this room and all personal data"
          >
            <Trash2 size={14} /> Purge
          </button>
        </div>
      </header>

      {/* AUCTION COMPLETED BANNER */}
      {auction.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-5 rounded-2xl bg-purple-950/80 border-2 border-purple-500/60 text-purple-100 backdrop-blur-xl flex items-center justify-between shadow-xl"
        >
          <div className="flex items-center gap-3">
            <Flag className="text-purple-400" size={24} />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-purple-200">Auction Finalized &amp; Completed</h2>
              <p className="text-xs text-purple-300/80 mt-0.5">All bidding operations are locked. You can export results CSV or review final rosters below.</p>
            </div>
          </div>
          <button
            className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-bold shadow-lg"
            onClick={() => {
              const csv = buildResultsCsv(auction);
              downloadTextFile(`${(auction.name || 'auction').replace(/[^a-z0-9]+/gi, '-')}-results.csv`, csv);
            }}
          >
            Download Final Rosters
          </button>
        </motion.div>
      )}

      {/* RTM PENDING ALERT */}
      {auction.rtmState?.pending && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-xl"
        >
          <div>
            <div className="text-amber-400 font-black text-lg flex items-center gap-2">
              <Award size={20} /> Right-to-Match (RTM) Triggered
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {auction.teams.find((t) => t.id === auction.rtmState?.rtmTeamId)?.name} can match {auction.currentBid} L to retain{' '}
              <strong className="text-white">{auction.activePlayer?.name}</strong>.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform hover:scale-105"
              onClick={() => auction.exerciseRtm(true)}
            >
              Match &amp; Retain
            </button>
            <button
              className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-transform hover:scale-105"
              onClick={() => auction.exerciseRtm(false)}
            >
              Decline RTM
            </button>
          </div>
        </motion.div>
      )}

      {/* MAIN ADMIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* PLAYER QUEUE SELECTION (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-5 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-[rgba(255,255,255,0.08)]">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Player Pool <span className="text-xs font-mono text-amber-400">({availablePlayers.length})</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
                onClick={() => setShowAddPlayerModal(true)}
              >
                <Plus size={12} /> Add
              </button>
              <button
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={12} /> CSV
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </div>
          {uploadMsg && <div className="text-xs text-amber-400 mb-3">{uploadMsg}</div>}

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {availablePlayers.map((p) => {
              const isEditing = editingPlayerId === p.id;
              return (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-[rgba(255,255,255,0.05)] hover:border-amber-500/30 transition-all flex flex-col gap-2"
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2 p-1">
                      <input
                        className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white outline-none"
                        value={editPlayerForm.name}
                        onChange={(e) => setEditPlayerForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Player Name"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Base:</span>
                        <input
                          type="number"
                          className="w-16 text-xs bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white outline-none"
                          value={editPlayerForm.basePrice}
                          onChange={(e) => setEditPlayerForm((f) => ({ ...f, basePrice: Number(e.target.value) }))}
                        />
                        <span className="text-[10px] text-slate-400">L</span>
                        <button
                          onClick={() => handleSaveEditPlayer(p.id)}
                          className="p-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                          title="Save Changes"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditingPlayerId(null)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-sm text-slate-100">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{p.role} · Base {p.basePrice} L</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          onClick={() => handleStartEditPlayer(p)}
                          title="Edit player"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          onClick={() => handleDeletePlayer(p.id, p.name)}
                          title="Delete player"
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-transform hover:scale-105"
                          disabled={!!auction.activePlayer || auction.status === 'completed'}
                          onClick={() => {
                            AIAuctioneer.announceNewPlayer(p.name, p.role, p.basePrice);
                            auction.setActivePlayer(p.id);
                          }}
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <input
                      placeholder="CricHeroes profile URL"
                      className="flex-1 text-[10px] bg-slate-900 border border-[rgba(255,255,255,0.1)] rounded-lg px-2.5 py-1 text-slate-200 outline-none"
                      defaultValue={p.cricheroesUrl || ''}
                      onChange={(e) => setCricheroesUrlDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                    <button
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      disabled={syncingIds.has(p.id)}
                      onClick={() => syncOnePlayer(p.id, cricheroesUrlDrafts[p.id] ?? p.cricheroesUrl ?? '')}
                    >
                      {syncingIds.has(p.id) || p.cricheroesStatus === 'pending' ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                    </button>
                  </div>
                </div>
              );
            })}
            {availablePlayers.length === 0 && (
              <div className="text-center text-xs text-slate-500 p-8">No players left in pool. All players auctioned!</div>
            )}
          </div>
        </div>

        {/* LIVE AUCTION CONTROL DECK (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-white">Live Bidding Deck</h2>
            <button
              onClick={() => AudioEngine.init()}
              className="text-xs text-amber-400 flex items-center gap-1 font-semibold hover:underline"
            >
              <Volume2 size={14} /> Sound Engine Active
            </button>
          </div>

          {auction.activePlayer ? (
            <div className="flex flex-col items-center justify-between flex-1 gap-6">
              {/* Active Player Preview */}
              <div className="w-full">
                <FeaturedPlayerCard player={auction.activePlayer} />
              </div>

              {/* LIVE BID & TIMER WHEEL */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-5xl font-black font-mono text-emerald-400 mb-2 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  {derived.effectiveBid} Lakhs
                </div>
                <div className="text-xs font-semibold text-slate-400 mb-4">
                  Highest Bidder:{' '}
                  {derived.highestBidderTeam ? derived.highestBidderTeam.name : 'No bids yet'}
                </div>

                {/* Animated Countdown Timer Bar */}
                <div className="w-64 h-3 bg-slate-950 rounded-full border border-slate-800 p-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-300"
                    style={{ width: `${timerPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-amber-400 mt-1 font-bold">
                  Timer: {auction.timer}s / {maxTimer}s
                </span>
              </div>

              {/* TIMER CONTROL BUTTONS */}
              <div className="flex gap-3">
                <button
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-2"
                  onClick={auction.startTimer}
                  disabled={auction.timerActive}
                >
                  <Play size={14} /> Start Timer
                </button>
                <button
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-2"
                  onClick={auction.pauseTimer}
                  disabled={!auction.timerActive}
                >
                  <Pause size={14} /> Pause Timer
                </button>
              </div>

              {/* PHYSICAL GAVEL ACTION BUTTONS */}
              <div className="grid grid-cols-3 gap-4 w-full pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSold}
                  className="py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm uppercase tracking-widest shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
                >
                  <Gavel size={18} /> Mark Sold
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUnsold}
                  className="py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-sm uppercase tracking-widest shadow-[0_0_25px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> Mark Unsold
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={auction.undoLastAction}
                  disabled={!auction.undoAvailable}
                  className="py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-sm uppercase tracking-wider border border-slate-700 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} /> Undo
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500">
              <Gavel size={48} className="mb-3 opacity-30 text-amber-400" />
              <h3 className="text-xl font-bold text-slate-300 mb-1">Auctioneer Console Ready</h3>
              <p className="text-xs max-w-sm">Select a player from the queue on the left to bring them onto the live bidding block.</p>
            </div>
          )}
        </div>
      </div>

      {/* TEAM PURSES & ANALYTICS */}
      <div className="mt-8">
        <AnalyticsPanel teams={auction.teams} players={auction.players} />
      </div>

      {/* PUBLIC LINKS */}
      <div className="mt-8 bg-slate-900/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 shadow-2xl">
        <h2 className="text-lg font-black text-white mb-2">Spectator &amp; Broadcast Links</h2>
        <p className="text-xs text-slate-400 mb-4">Share these links for public livestream viewers or OBS overlays:</p>
        <div className="flex flex-col gap-2.5 text-xs">
          <CopyRow label="Spectator View" value={spectatorLink} />
          <CopyRow label="OBS Broadcast Overlay" value={broadcastLink} />
        </div>
      </div>

      {/* TEAM LINKS MODAL */}
      <AnimatePresence>
        {showTeamLinksModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="text-amber-400" size={20} />
                  <h3 className="text-lg font-black text-white">Franchise Team Bidder Links</h3>
                </div>
                <button
                  onClick={() => setShowTeamLinksModal(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Share these private URLs with each team captain. Each link includes their capability token for placing bids:
              </p>

              {teamLinksLoading ? (
                <div className="py-12 flex justify-center items-center text-slate-400 gap-2">
                  <Loader2 className="animate-spin" size={20} /> Loading franchise links...
                </div>
              ) : (
                <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                  {teamLinks.map((t) => {
                    const teamUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}&role=team&token=${t.token}&teamId=${t.id}`;
                    return (
                      <div key={t.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{t.name} ({t.code})</span>
                          <span className="font-mono text-emerald-400">Purse: {t.purse} L</span>
                        </div>
                        <CopyRow label="Bidder Link" value={teamUrl} />
                      </div>
                    );
                  })}
                  {teamLinks.length === 0 && (
                    <div className="text-center text-xs text-slate-500 py-8">No teams found for this room.</div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD MANUAL PLAYER MODAL */}
      <AnimatePresence>
        {showAddPlayerModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Plus className="text-amber-400" size={20} />
                  <h3 className="text-lg font-black text-white">Add Player to Auction Pool</h3>
                </div>
                <button
                  onClick={() => setShowAddPlayerModal(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddManualPlayer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Player Name *</label>
                  <input
                    required
                    value={addPlayerForm.name}
                    onChange={(e) => setAddPlayerForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                    placeholder="e.g. Virat Kohli"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                    <select
                      value={addPlayerForm.role}
                      onChange={(e) => setAddPlayerForm((f) => ({ ...f, role: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="Wicketkeeper">Wicketkeeper</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Base Price (Lakhs) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={addPlayerForm.basePrice}
                      onChange={(e) => setAddPlayerForm((f) => ({ ...f, basePrice: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Previous Team Code (for RTM)</label>
                  <input
                    value={addPlayerForm.previousTeamCode}
                    onChange={(e) => setAddPlayerForm((f) => ({ ...f, previousTeamCode: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    placeholder="e.g. RCB, CSK, MI"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Photo URL (Optional)</label>
                  <input
                    value={addPlayerForm.photoUrl}
                    onChange={(e) => setAddPlayerForm((f) => ({ ...f, photoUrl: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPlayerModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider"
                  >
                    Add Player
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CopyRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 w-44 font-semibold shrink-0">{label}:</span>
      <input readOnly value={value} className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono outline-none" onFocus={(e) => e.target.select()} />
      <button
        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  );
};
