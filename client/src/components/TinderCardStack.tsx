import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { User, Flame, DollarSign, ShieldAlert, Award, ExternalLink, Loader2, Sparkles, ChevronRight } from 'lucide-react';
import type { Player, Team } from '../hooks/useAuction';
import { AudioEngine } from './AudioEngine';

interface TinderCardStackProps {
  activePlayer: Player | null;
  upcomingPlayers?: Player[];
  /** The value to display - already resolved to "current bid, or base price if no bid yet" by the caller (see useAuctionDerived.effectiveBid). This component doesn't re-derive it. */
  currentBid: number;
  highestBidderTeam?: Team | null;
  onBid: () => void;
  onPass?: () => void;
  onReaction?: (emoji: string) => void;
  isBidDisabled?: boolean;
  disabledReason?: string;
}

const STAT_LABELS: Record<string, string> = {
  runs: 'Runs',
  wickets: 'Wickets',
  average: 'Avg',
  strikeRate: 'S/R',
  economy: 'Econ',
  matches: 'Matches',
};

export const TinderCardStack: React.FC<TinderCardStackProps> = ({
  activePlayer,
  upcomingPlayers = [],
  currentBid,
  highestBidderTeam,
  onBid,
  onPass,
  onReaction,
  isBidDisabled = false,
  disabledReason,
}) => {
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | 'up' | null>(null);

  // Motion values for swipe gesture physics
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Rotation based on horizontal drag distance (Tinder signature tilt)
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Stamp opacities based on drag direction
  const bidStampOpacity = useTransform(x, [20, 120], [0, 1]);
  const passStampOpacity = useTransform(x, [-120, -20], [1, 0]);
  const boostStampOpacity = useTransform(y, [-120, -20], [1, 0]);

  // Handle drag gesture end
  const handleDragEnd = (_: any, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    const swipeThreshold = 100;

    if (info.offset.x > swipeThreshold) {
      // Swiped right -> BID!
      if (!isBidDisabled) {
        AudioEngine.playBidSound();
        onBid();
      }
    } else if (info.offset.x < -swipeThreshold) {
      // Swiped left -> PASS
      if (onPass) {
        AudioEngine.playTimerTick();
        onPass();
      }
    } else if (info.offset.y < -swipeThreshold) {
      // Swiped up -> Quick Boost / Reaction
      if (onReaction) {
        onReaction('🔥');
        AudioEngine.playCheerSound();
      }
    }

    setDragDirection(null);
  };

  if (!activePlayer) {
    return (
      <div className="relative w-full max-w-md mx-auto aspect-[3/4] flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-[rgba(15,23,42,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-2xl">
        <div className="w-20 h-20 rounded-full bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] flex items-center justify-center mb-4 text-amber-400 animate-pulse">
          <Sparkles size={36} />
        </div>
        <h3 className="text-2xl font-bold text-slate-100 mb-2">Auction Block Quiet</h3>
        <p className="text-sm text-slate-400">Waiting for auctioneer to bring the next player to the block...</p>
      </div>
    );
  }

  const photo = activePlayer.cricheroesPhotoUrl || activePlayer.photoUrl;
  const displayVal = currentBid;

  // Gather stats entries
  const manualStats = (Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[])
    .filter((k) => (activePlayer as any)[k] !== undefined && (activePlayer as any)[k] !== null)
    .map((k) => [STAT_LABELS[k], String((activePlayer as any)[k])] as [string, string]);
  const scrapedStats = activePlayer.cricheroesStats ? Object.entries(activePlayer.cricheroesStats) : [];
  const statEntries = scrapedStats.length > 0 ? scrapedStats : manualStats;

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[3/4] perspective-1000 select-none">
      {/* Background Stacked Card 2 (Deepest) */}
      {upcomingPlayers[1] && (
        <div className="absolute inset-0 rounded-3xl bg-[rgba(15,23,42,0.5)] border border-[rgba(255,255,255,0.04)] transform scale-90 translate-y-6 opacity-40 pointer-events-none shadow-xl" />
      )}

      {/* Background Stacked Card 1 (Middle) */}
      {upcomingPlayers[0] && (
        <div className="absolute inset-0 rounded-3xl bg-[rgba(15,23,42,0.8)] border border-[rgba(255,255,255,0.08)] transform scale-95 translate-y-3 opacity-70 pointer-events-none shadow-2xl overflow-hidden flex flex-col justify-end p-6">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Up Next</div>
          <div className="text-lg font-bold text-slate-300">{upcomingPlayers[0].name}</div>
        </div>
      )}

      {/* Main Top Swipeable Card */}
      <motion.div
        style={{ x, y, rotate }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 1.02, cursor: 'grabbing' }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="relative w-full h-full rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950/98 backdrop-blur-2xl border border-[rgba(255,255,255,0.12)] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col justify-between cursor-grab"
      >
        {/* TINDER STAMPS OVERLAY */}
        {/* BID Stamp (Swipe Right) */}
        <motion.div
          style={{ opacity: bidStampOpacity }}
          className="absolute top-8 left-8 z-30 pointer-events-none border-4 border-emerald-400 text-emerald-400 font-black text-3xl px-4 py-1.5 rounded-2xl transform -rotate-12 tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.5)] bg-slate-950/80 backdrop-blur-md"
        >
          BID! 🏏
        </motion.div>

        {/* PASS Stamp (Swipe Left) */}
        <motion.div
          style={{ opacity: passStampOpacity }}
          className="absolute top-8 right-8 z-30 pointer-events-none border-4 border-rose-500 text-rose-500 font-black text-3xl px-4 py-1.5 rounded-2xl transform rotate-12 tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.5)] bg-slate-950/80 backdrop-blur-md"
        >
          PASS ✋
        </motion.div>

        {/* BOOST Stamp (Swipe Up) */}
        <motion.div
          style={{ opacity: boostStampOpacity }}
          className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none border-4 border-amber-400 text-amber-400 font-black text-2xl px-5 py-1.5 rounded-2xl tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.5)] bg-slate-950/80 backdrop-blur-md"
        >
          FIRE BOOST 🔥
        </motion.div>

        {/* TOP CARD HEADER / PLAYER PHOTO */}
        <div className="relative w-full h-[55%] bg-slate-950 overflow-hidden">
          {photo ? (
            <img
              src={photo}
              alt={activePlayer.name}
              className="w-full h-full object-cover object-top filter brightness-105 contrast-105 transition-transform duration-500 pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950 text-slate-500">
              <User size={72} strokeWidth={1.5} />
              <span className="text-xs uppercase tracking-widest mt-2 font-medium">No Image Provided</span>
            </div>
          )}

          {/* Gradient Overlay for card readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />

          {/* Role Pill */}
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-lg flex items-center gap-1.5">
              <Award size={14} className="text-amber-400" />
              {activePlayer.role}
            </span>
          </div>

          {/* CricHeroes Badge / Status */}
          <div className="absolute top-4 right-4 z-10">
            {activePlayer.cricheroesStatus === 'pending' && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-900/80 text-amber-400 border border-amber-500/30 flex items-center gap-1 backdrop-blur-md">
                <Loader2 size={12} className="animate-spin" /> CricHeroes
              </span>
            )}
            {activePlayer.cricheroesUrl && (
              <a
                href={activePlayer.cricheroesUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors flex items-center gap-1 backdrop-blur-md"
              >
                CricHeroes Verified <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Live Price Tag floating on Image */}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                {activePlayer.name}
              </h2>
              <p className="text-xs font-medium text-slate-300">Base Price: {activePlayer.basePrice} Lakhs</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Current Bid</div>
              <div className="text-3xl font-black font-mono text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                {displayVal} L
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CARD DETAILS / STATS & HIGHEST BIDDER */}
        <div className="p-5 flex-1 flex flex-col justify-between bg-slate-950/80 backdrop-blur-md">
          {/* Highest Bidder Banner */}
          <div className="mb-3 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Highest Bidder:</span>
            {highestBidderTeam ? (
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {highestBidderTeam.name}
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic">No bids placed yet</span>
            )}
          </div>

          {/* Player Key Stats Pill Grid */}
          {statEntries.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {statEntries.slice(0, 6).map(([label, value]) => (
                <div
                  key={label}
                  className="bg-slate-900/60 border border-[rgba(255,255,255,0.05)] rounded-lg p-2 text-center"
                >
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</div>
                  <div className="text-sm font-bold font-mono text-emerald-400">{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* SWIPE HELP HINT / BUTTON TRIGGER */}
          <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="text-amber-400">💡</span> Swipe right to bid or left to pass
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isBidDisabled) {
                  AudioEngine.playBidSound();
                  onBid();
                }
              }}
              disabled={isBidDisabled}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all duration-200 flex items-center gap-1.5 ${
                isBidDisabled
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              }`}
            >
              Bid Now <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
