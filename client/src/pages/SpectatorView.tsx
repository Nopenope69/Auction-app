import React, { useState } from 'react';
import { useAuction, Role } from '../hooks/useAuction';
import { TournamentSimulator } from '../components/TournamentSimulator';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { FeaturedPlayerCard } from '../components/FeaturedPlayerCard';
import { AudioEngine } from '../components/AudioEngine';
import { AIAuctioneer } from '../components/AIAuctioneer';
import { FloatingReactions } from '../components/FloatingReactions';
import { buildResultsCsv, downloadTextFile } from '../lib/csvExport';
import { Download, Trophy, Volume2, Users, DollarSign, Activity, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpectatorViewProps {
  roomId: string;
  token?: string | null;
  role: Role;
  teamId?: string | null;
}

export const SpectatorView: React.FC<SpectatorViewProps> = ({ roomId, token, role, teamId }) => {
  const auction = useAuction({ roomId, token, role, teamId });
  const [showSimulator, setShowSimulator] = useState(false);

  const highestBidderTeam = auction.teams.find((t) => t.id === auction.highestBidder);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col relative font-sans">
      <FloatingReactions reactions={auction.reactionEmojiList} />

      {/* TOP HEADER */}
      <header className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b border-[rgba(255,255,255,0.08)] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-400" size={28} />
            <h1 className="text-3xl font-black text-white">{auction.name || 'Live Spectator Deck'}</h1>
          </div>
          <div className="text-xs font-semibold text-slate-400 mt-1">
            Real-Time Auction Arena · Total Players: <span className="text-amber-400 font-mono font-bold">{auction.players.length}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5"
            onClick={() => {
              AudioEngine.init();
              AIAuctioneer.init();
            }}
          >
            <Volume2 size={14} /> Enable Audio
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5"
            onClick={() =>
              downloadTextFile(`${(auction.name || 'auction').replace(/[^a-z0-9]+/gi, '-')}-results.csv`, buildResultsCsv(auction))
            }
          >
            <Download size={14} /> Export Results
          </button>
          <button
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform hover:scale-105 flex items-center gap-1.5"
            onClick={() => setShowSimulator(true)}
          >
            <Trophy size={14} /> Simulate Tournament
          </button>
        </div>
      </header>

      {/* TOURNAMENT SIMULATOR MODAL */}
      {showSimulator && <TournamentSimulator teams={auction.teams} onClose={() => setShowSimulator(false)} />}

      {/* ACTIVE PLAYER BLOCK */}
      {auction.activePlayer ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 mb-8 shadow-[0_0_40px_rgba(245,158,11,0.15)] flex flex-col lg:flex-row items-center gap-8"
        >
          <div className="flex-1 w-full">
            <div className="text-xs font-bold uppercase text-amber-400 tracking-widest mb-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              On The Block
            </div>
            <FeaturedPlayerCard player={auction.activePlayer} size="large" />
          </div>

          <div className="w-full lg:w-72 bg-slate-950/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 text-center flex flex-col items-center justify-center">
            <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">Current Highest Bid</div>
            <div className="text-5xl font-black font-mono text-emerald-400 mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              {auction.currentBid > 0 ? auction.currentBid : auction.activePlayer.basePrice} L
            </div>
            <div className="text-xs font-semibold text-slate-300">
              Highest Bidder:
            </div>
            <div className="text-sm font-black text-amber-400 mt-0.5">
              {highestBidderTeam ? highestBidderTeam.name : 'No bids placed yet'}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-slate-900/40 border border-[rgba(255,255,255,0.05)] rounded-3xl p-8 mb-8 text-center text-slate-500">
          Waiting for next player to come onto the block...
        </div>
      )}

      {/* TEAM ROSTERS & LEADERBOARD GRID */}
      <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
        <Users size={20} className="text-amber-400" /> Team Rosters &amp; Purse Leaderboard
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {auction.teams.map((t) => (
          <div
            key={t.id}
            className="bg-slate-900/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] hover:border-amber-500/30 rounded-3xl p-5 shadow-xl transition-all flex flex-col"
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[rgba(255,255,255,0.08)]">
              <div>
                <h3 className="font-bold text-base text-white truncate" title={t.name}>
                  {t.name}
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">{t.code}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-black font-mono text-emerald-400">{t.purse} L</div>
                <div className="text-[10px] text-slate-400 font-semibold">{t.players.length} Signed</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-56">
              {t.players.length > 0 ? (
                <ul className="space-y-2 text-xs">
                  {t.players.map((p) => (
                    <li
                      key={p.id}
                      className="p-2 rounded-xl bg-slate-950/60 border border-[rgba(255,255,255,0.04)] flex justify-between items-center"
                    >
                      <span className="font-bold text-slate-200 truncate">{p.name}</span>
                      <span className="font-mono text-amber-400 font-bold shrink-0">{p.soldPrice} L</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-500 italic p-4 text-center">No players signed</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ANALYTICS */}
      <div className="mt-8">
        <AnalyticsPanel teams={auction.teams} players={auction.players} />
      </div>
    </div>
  );
};
