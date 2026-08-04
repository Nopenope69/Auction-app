import React from 'react';
import { User, Award, Flame, Sparkles } from 'lucide-react';
import { useAuction, Role } from '../hooks/useAuction';
import { useAuctionDerived } from '../hooks/useAuctionDerived';
import { FloatingReactions } from '../components/FloatingReactions';
import { motion, AnimatePresence } from 'framer-motion';

interface BroadcastOverlayProps {
  roomId: string;
  token?: string | null;
  role: Role;
  teamId?: string | null;
}

export const BroadcastOverlay: React.FC<BroadcastOverlayProps> = ({ roomId, token, role, teamId }) => {
  const auction = useAuction({ roomId, token, role, teamId });
  const derived = useAuctionDerived(auction); // broadcast overlay - no "my team"

  // Last 5 completed outcomes
  const recentOutcomes = [...auction.biddingLog]
    .filter((e) => e.type === 'sold' || e.type === 'rtm' || e.type === 'unsold')
    .slice(-5)
    .reverse();

  const photo = auction.activePlayer?.cricheroesPhotoUrl || auction.activePlayer?.photoUrl;
  const highestBidderTeam = derived.highestBidderTeam;

  return (
    <div className="w-screen h-screen chroma-key-bg relative overflow-hidden flex flex-col justify-end p-8 font-sans">
      <FloatingReactions reactions={auction.reactionEmojiList} />

      {/* TOP RIGHT: PURSE STANDINGS TICKER */}
      <div className="absolute top-8 right-8 bg-slate-950/90 backdrop-blur-2xl border border-[rgba(255,255,255,0.12)] rounded-3xl p-5 w-72 shadow-2xl z-20">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[rgba(255,255,255,0.08)]">
          <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} /> Team Purses
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <div className="space-y-2 max-h-60 overflow-hidden">
          {auction.teams.map((t) => (
            <div key={t.id} className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-200 truncate max-w-[140px]">{t.name}</span>
              <span className="font-mono font-bold text-emerald-400">{t.purse} L</span>
            </div>
          ))}
        </div>
      </div>

      {/* TOP LEFT: RECENT TRANSACTIONS TICKER */}
      {recentOutcomes.length > 0 && (
        <div className="absolute top-8 left-8 bg-slate-950/90 backdrop-blur-2xl border border-[rgba(255,255,255,0.12)] rounded-3xl p-5 w-80 shadow-2xl z-20">
          <div className="text-xs font-black uppercase text-amber-400 tracking-wider pb-3 mb-3 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-1.5">
            <Flame size={14} /> Recent Deals
          </div>
          <div className="space-y-2">
            {recentOutcomes.map((e) => (
              <div key={e.id} className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200 truncate max-w-[130px]">{e.playerName}</span>
                <span
                  className={`font-mono font-bold ${
                    e.type === 'unsold' ? 'text-rose-500' : 'text-emerald-400'
                  }`}
                >
                  {e.type === 'unsold' ? 'UNSOLD' : `${e.teamName} · ${e.amount}L`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN BOTTOM BROADCAST LOWER-THIRD GRAPHIC */}
      <AnimatePresence mode="wait">
        {auction.activePlayer && (
          <motion.div
            key={auction.activePlayer.id}
            initial={{ opacity: 0, y: 50, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full max-w-5xl mx-auto rounded-3xl bg-slate-950/95 backdrop-blur-2xl border-2 border-amber-500/40 p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex items-center gap-8 relative overflow-hidden z-20"
          >
            {/* Ambient Background Accent Glow */}
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* PLAYER PHOTO BOX */}
            <div className="w-44 h-44 rounded-2xl bg-slate-900 border border-[rgba(255,255,255,0.1)] overflow-hidden shrink-0 shadow-2xl relative">
              {photo ? (
                <img src={photo} alt={auction.activePlayer.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <User size={64} />
                </div>
              )}
              <div className="absolute top-2 left-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-widest">
                  {auction.activePlayer.role}
                </span>
              </div>
            </div>

            {/* PLAYER INFO & LIVE BID STATS */}
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl font-black text-white uppercase tracking-tight truncate mb-1">
                {auction.activePlayer.name}
              </h1>
              <p className="text-sm font-bold text-slate-400 mb-4">
                Base Price: <span className="text-amber-400 font-mono">{auction.activePlayer.basePrice} Lakhs</span>
              </p>

              {/* STATS STRIP */}
              {auction.activePlayer.cricheroesStats && (
                <div className="flex gap-4 flex-wrap mb-4">
                  {Object.entries(auction.activePlayer.cricheroesStats).slice(0, 4).map(([label, val]) => (
                    <div key={label} className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-center">
                      <div className="text-[9px] uppercase font-bold text-slate-400">{label}</div>
                      <div className="text-xs font-mono font-bold text-emerald-400">{val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* CURRENT BID DISPLAY */}
              <div className="flex items-end justify-between pt-2 border-t border-[rgba(255,255,255,0.08)]">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Bidding Amount</div>
                  <div className="text-5xl font-black font-mono text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                    {derived.effectiveBid} L
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leading Team</div>
                  <div className="text-2xl font-black text-amber-400 flex items-center justify-end gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    {highestBidderTeam ? highestBidderTeam.name : 'Waiting for Bids'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
