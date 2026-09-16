import React, { useState, useMemo } from 'react';
import { User, Award, Flame, Clock, Sliders, Shield, Check, Eye, EyeOff, Volume2, VolumeX, CheckCircle2, XCircle } from 'lucide-react';
import { useAuction, Role } from '../hooks/useAuction';
import { useAuctionDerived } from '../hooks/useAuctionDerived';
import { FloatingReactions } from '../components/FloatingReactions';
import { AudioEngine } from '../components/AudioEngine';
import { AIAuctioneer } from '../components/AIAuctioneer';
import { motion, AnimatePresence } from 'framer-motion';

interface BroadcastOverlayProps {
  roomId: string;
  token?: string | null;
  role: Role;
  teamId?: string | null;
}

type ChromaMode = 'transparent' | 'green' | 'magenta';

export const BroadcastOverlay: React.FC<BroadcastOverlayProps> = ({ roomId, token, role, teamId }) => {
  const auction = useAuction({ roomId, token, role, teamId });
  const derived = useAuctionDerived(auction); // broadcast overlay - no "my team"

  const [chromaMode, setChromaMode] = useState<ChromaMode>('transparent');
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Last 5 completed outcomes
  const recentOutcomes = useMemo(() => {
    return [...auction.biddingLog]
      .filter((e) => e.type === 'sold' || e.type === 'rtm' || e.type === 'unsold')
      .slice(-5)
      .reverse();
  }, [auction.biddingLog]);

  // Last outcome for celebration banner
  const lastOutcome = useMemo(() => {
    return [...auction.biddingLog].reverse().find((e) => e.type === 'sold' || e.type === 'rtm' || e.type === 'unsold');
  }, [auction.biddingLog]);

  const isRecentOutcome = lastOutcome && Date.now() - lastOutcome.timestamp < 10000;

  const photo = auction.activePlayer?.cricheroesPhotoUrl || auction.activePlayer?.photoUrl;
  const highestBidderTeam = derived.highestBidderTeam;

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    AIAuctioneer.toggle(next);
    if (next) AudioEngine.init();
  };

  const bgClass =
    chromaMode === 'green'
      ? 'chroma-green'
      : chromaMode === 'magenta'
      ? 'chroma-magenta'
      : 'chroma-transparent';

  return (
    <div className={`w-screen h-screen ${bgClass} relative overflow-hidden flex flex-col justify-between p-8 font-sans select-none`}>
      {/* Floating Reactions Layer */}
      <FloatingReactions reactions={auction.reactionEmojiList} />

      {/* BROADCAST SAFE ZONES (CALIBRATION OVERLAY) */}
      {showSafeZones && (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
          {/* Action Safe (90%) */}
          <div className="w-[90vw] h-[90vh] border-2 border-dashed border-cyan-400/40 flex items-center justify-center">
            {/* Title Safe (80%) */}
            <div className="w-[80vw] h-[80vh] border-2 border-dotted border-amber-400/40 relative">
              <span className="absolute top-2 left-2 text-[10px] font-mono text-[#38bdf8] uppercase tracking-widest bg-[var(--bg-base)]/90 px-2 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                ACTION SAFE (90%)
              </span>
              <span className="absolute bottom-2 left-2 text-[10px] font-mono text-[#c2a365] uppercase tracking-widest bg-[var(--bg-base)]/90 px-2 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                TITLE SAFE (80%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STREAMER HUD CONTROLS (Fades out when not hovering) */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-20 hover:opacity-100 translate-y-0'
        }`}
      >
        <div className="bg-[var(--bg-surface)] backdrop-blur-2xl border border-[var(--border-subtle)] rounded-[12px] px-4 py-2 shadow-2xl flex items-center gap-3 text-xs">
          <button
            onClick={() => setShowControls(!showControls)}
            className="text-[#c2a365] font-bold flex items-center gap-1.5 focus-ring"
          >
            <Sliders size={14} />
            <span className="hidden sm:inline">Stream HUD</span>
          </button>

          {showControls && (
            <>
              <div className="h-4 w-px bg-[var(--border-subtle)]" />
              {/* Chroma Key Selector */}
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <span className="text-[var(--text-secondary)] mr-1">Chroma:</span>
                <button
                  onClick={() => setChromaMode('transparent')}
                  className={`px-2 py-1 rounded-[8px] transition-colors ${
                    chromaMode === 'transparent'
                      ? 'bg-[#c2a365] text-[#0b0a09] font-black'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Alpha
                </button>
                <button
                  onClick={() => setChromaMode('green')}
                  className={`px-2 py-1 rounded-[8px] transition-colors ${
                    chromaMode === 'green'
                      ? 'bg-[#10b981] text-[#0b0a09] font-black'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Green
                </button>
                <button
                  onClick={() => setChromaMode('magenta')}
                  className={`px-2 py-1 rounded-[8px] transition-colors ${
                    chromaMode === 'magenta'
                      ? 'bg-fuchsia-500 text-white font-black'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Magenta
                </button>
              </div>

              <div className="h-4 w-px bg-[var(--border-subtle)]" />

              {/* Safe Zones Toggle */}
              <button
                onClick={() => setShowSafeZones(!showSafeZones)}
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold flex items-center gap-1 transition-colors ${
                  showSafeZones ? 'bg-[#38bdf8] text-[#0b0a09]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {showSafeZones ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>Guides</span>
              </button>

              {/* Audio Commentary Toggle */}
              <button
                onClick={toggleAudio}
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold flex items-center gap-1 transition-colors ${
                  audioEnabled ? 'bg-[#10b981] text-[#0b0a09]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {audioEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                <span>Audio</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TOP ROW: RECENT DEALS (LEFT) & PURSE STANDINGS (RIGHT) */}
      <div className="w-full flex items-start justify-between gap-6 pointer-events-none">
        {/* TOP LEFT: RECENT DEALS TICKER */}
        {recentOutcomes.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[var(--bg-surface)] backdrop-blur-2xl border border-[var(--border-subtle)] rounded-[16px] p-4 w-80 shadow-2xl pointer-events-auto"
          >
            <div className="text-[11px] font-black uppercase text-[#c2a365] tracking-wider pb-2 mb-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Flame size={14} className="text-[#c2a365]" /> Recent Hammer Falls
              </span>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">Live</span>
            </div>
            <div className="space-y-1.5">
              {recentOutcomes.map((e) => (
                <div
                  key={e.id}
                  className="flex justify-between items-center text-xs p-1.5 rounded-[8px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                >
                  <span className="font-bold text-[var(--text-primary)] truncate max-w-[130px]">{e.playerName}</span>
                  <span
                    className={`font-mono font-bold tabular-nums text-[11px] px-1.5 py-0.5 rounded-[6px] ${
                      e.type === 'unsold'
                        ? 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30'
                        : 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
                    }`}
                  >
                    {e.type === 'unsold' ? 'UNSOLD' : `${e.teamName} · ${e.amount}L`}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : <div />}

        {/* TOP RIGHT: TEAM PURSE LEADERBOARD */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[var(--bg-surface)] backdrop-blur-2xl border border-[var(--border-subtle)] rounded-[16px] p-4 w-72 shadow-2xl pointer-events-auto"
        >
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[var(--border-subtle)]">
            <span className="text-[11px] font-bold uppercase text-[#c2a365] tracking-wider flex items-center gap-1.5">
              <Award size={14} /> Team Purses
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">{auction.teams.length} Teams</span>
            </span>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-hidden">
            {auction.teams.map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-center text-xs px-2 py-1.5 rounded-[8px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  <span className="text-[10px] font-mono font-black px-1 rounded-[4px] bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                    {t.code}
                  </span>
                  <span className="font-bold text-[var(--text-primary)] truncate">{t.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-[#10b981] tabular-nums">{t.purse}L</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* BOTTOM ROW: MAIN BROADCAST LOWER-THIRD GRAPHIC */}
      <div className="w-full pb-4">
        <AnimatePresence mode="wait">
          {auction.activePlayer ? (
            /* ON THE BLOCK LOWER-THIRD */
            <motion.div
              key={auction.activePlayer.id}
              initial={{ opacity: 0, y: 60, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full max-w-6xl mx-auto rounded-[16px] bg-[#0b0a09]/98 backdrop-blur-2xl border-2 border-[#c2a365]/50 p-6 shadow-[0_10px_50px_rgba(0,0,0,0.9)] flex items-center gap-8 relative overflow-hidden z-20"
            >
              {/* Broadcast Studio Ambient Glow */}
              <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-[#c2a365]/15 rounded-full blur-3xl pointer-events-none" />

              {/* PLAYER PHOTO FRAME */}
              <div className="w-48 h-48 rounded-[16px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden shrink-0 shadow-2xl relative">
                {photo ? (
                  <img
                    src={photo}
                    alt={auction.activePlayer.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] bg-[var(--bg-elevated)]">
                    <User size={64} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mt-1">
                      No Photo
                    </span>
                  </div>
                )}
                {/* Role Pill on Image */}
                <div className="absolute top-2 left-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#c2a365] text-[#0b0a09] uppercase tracking-widest shadow-md">
                    {auction.activePlayer.role}
                  </span>
                </div>
                {auction.activePlayer.cricheroesUrl && (
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#10b981]/90 text-[#0b0a09] uppercase tracking-wider">
                      Verified
                    </span>
                  </div>
                )}
              </div>

              {/* PLAYER METADATA & LIVE BID COCKPIT */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-48">
                {/* Top: Name, Base Price & Stats Strip */}
                <div>
                  <div className="flex items-center justify-between">
                    <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight truncate">
                      {auction.activePlayer.name}
                    </h1>
                    {/* Countdown Timer Graphic */}
                    {auction.timerActive && (
                      <div
                        className={`px-3 py-1 rounded-[12px] font-mono font-black text-sm flex items-center gap-1.5 border ${
                          auction.timer <= 3
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                            : 'bg-[#c2a365]/20 border-[#c2a365]/50 text-[#c2a365]'
                        }`}
                      >
                        <Clock size={14} />
                        <span className="tabular-nums">{auction.timer}s</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)] font-bold">
                    <span>
                      Base Price: <span className="text-[#c2a365] font-mono">{auction.activePlayer.basePrice} L</span>
                    </span>
                    {auction.activePlayer.matches != null && (
                      <>
                        <span className="text-[var(--text-tertiary)]">·</span>
                        <span>{auction.activePlayer.matches} Matches</span>
                      </>
                    )}
                  </div>

                  {/* CricHeroes / Scraped Stats Strip */}
                  {auction.activePlayer.cricheroesStats && Object.keys(auction.activePlayer.cricheroesStats).length > 0 ? (
                    <div className="flex gap-2.5 flex-wrap mt-2.5">
                      {Object.entries(auction.activePlayer.cricheroesStats).slice(0, 5).map(([label, val]) => (
                        <div
                          key={label}
                          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-2.5 py-1 text-center"
                        >
                          <div className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">{label}</div>
                          <div className="text-xs font-mono font-bold text-[#38bdf8] tabular-nums">{val}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Bottom: Current Bid & Leading Team Banner */}
                <div className="flex items-end justify-between pt-3 border-t border-[rgba(255,255,255,0.08)]">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                      Live Highest Bid
                    </div>
                    <div className="text-5xl font-black font-mono text-[#38bdf8] tabular-nums drop-shadow-[0_0_20px_rgba(56,189,248,0.4)] leading-none mt-1">
                      {derived.effectiveBid} <span className="text-2xl font-sans text-[var(--text-secondary)]">Lakhs</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
                      Leading Franchise
                    </div>
                    {highestBidderTeam ? (
                      <div className="flex items-center justify-end gap-2 bg-[var(--bg-elevated)] border border-[#c2a365]/30 px-3.5 py-1.5 rounded-[12px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping" />
                        <span className="text-xl font-bold text-[#c2a365] truncate max-w-[220px]">
                          {highestBidderTeam.name}
                        </span>
                        <span className="text-xs font-mono font-bold text-[var(--text-secondary)] px-1.5 py-0.5 rounded-[4px] bg-[var(--bg-base)]">
                          {highestBidderTeam.code}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-[#c2a365]/80 italic">
                        Waiting for opening bid...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isRecentOutcome ? (
            /* RECENT HAMMER OUTCOME BANNER (SOLD / UNSOLD / RTM) */
            <motion.div
              key={`outcome-${lastOutcome.id}`}
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-4xl mx-auto rounded-[16px] backdrop-blur-2xl border-2 p-6 shadow-2xl flex items-center justify-between z-20 ${
                lastOutcome.type === 'sold' || lastOutcome.type === 'rtm'
                  ? 'bg-[#0b0a09]/98 border-[#10b981]/70 shadow-[0_0_60px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0b0a09]/98 border-rose-500/70 shadow-[0_0_60px_rgba(244,63,94,0.3)]'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-[12px] flex items-center justify-center text-white ${
                    lastOutcome.type === 'sold' || lastOutcome.type === 'rtm'
                      ? 'bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981]'
                      : 'bg-rose-500/20 border border-rose-500/50 text-rose-400'
                  }`}
                >
                  {lastOutcome.type === 'sold' || lastOutcome.type === 'rtm' ? (
                    <CheckCircle2 size={32} />
                  ) : (
                    <XCircle size={32} />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    {lastOutcome.type === 'rtm'
                      ? 'RIGHT TO MATCH EXERCISED'
                      : lastOutcome.type === 'sold'
                      ? 'HAMMER FALL · PLAYER SOLD'
                      : 'HAMMER FALL · PLAYER UNSOLD'}
                  </div>
                  <h2 className="text-3xl font-display font-bold text-white">{lastOutcome.playerName}</h2>
                </div>
              </div>

              {lastOutcome.type !== 'unsold' && (
                <div className="text-right">
                  <div className="text-sm font-bold text-[#c2a365]">Sold to {lastOutcome.teamName}</div>
                  <div className="text-4xl font-black font-mono text-[#38bdf8] tabular-nums">
                    {lastOutcome.amount} Lakhs
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* INTERMISSION / BREAK TV CARD */
            <motion.div
              key="break"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="w-full max-w-3xl mx-auto rounded-[16px] bg-[#0b0a09]/95 backdrop-blur-xl border border-[var(--border-subtle)] px-6 py-4 shadow-2xl flex items-center justify-between z-20"
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c2a365] animate-ping" />
                <div>
                  <div className="text-sm font-display font-bold text-white tracking-wide">
                    {auction.name || 'CRICKET PLAYER AUCTION'}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Live Broadcast · Next Contender Coming To Block</div>
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-[#c2a365] uppercase tracking-wider bg-[var(--bg-elevated)] border border-[#c2a365]/30 px-3 py-1.5 rounded-[8px]">
                Intermission
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

