import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { User, Award, ExternalLink, Loader2, Clock, Orbit, Layers, Check, X } from 'lucide-react';
import type { Player, Team } from '../hooks/useAuction';
import { AudioEngine } from './AudioEngine';
import { RotatingCarousel, CarouselItem } from './animations/RotatingCarousel';

interface TinderCardStackProps {
  activePlayer: Player | null;
  upcomingPlayers?: Player[];
  /** The value to display - already resolved to "current bid, or base price if no bid yet" by the caller (see useAuctionDerived.effectiveBid). */
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
  const [viewMode, setViewMode] = useState<'carousel' | 'card'>('carousel');
  const [stagedConfirm, setStagedConfirm] = useState(false);

  // Motion values for swipe gesture physics (in card mode)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  const bidStampOpacity = useTransform(x, [20, 120], [0, 1]);
  const passStampOpacity = useTransform(x, [-120, -20], [1, 0]);
  const boostStampOpacity = useTransform(y, [-120, -20], [1, 0]);

  const handleDragEnd = (_: any, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      if (!isBidDisabled) {
        // Stage confirmation boundary instead of direct ambiguous submission
        AudioEngine.playTimerTick();
        setStagedConfirm(true);
      }
    } else if (info.offset.x < -swipeThreshold) {
      if (onPass) {
        AudioEngine.playTimerTick();
        onPass();
      }
    } else if (info.offset.y < -swipeThreshold) {
      if (onReaction) {
        onReaction('🔥');
        AudioEngine.playCheerSound();
      }
    }
  };

  if (!activePlayer && upcomingPlayers.length === 0) {
    return (
      <div className="relative w-full max-w-md mx-auto aspect-[3/4] flex flex-col items-center justify-center p-8 text-center rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl">
        <div className="w-16 h-16 rounded-[14px] bg-[#38bdf8]/10 border border-[#38bdf8]/30 flex items-center justify-center mb-4 text-[#38bdf8] animate-pulse">
          <Clock size={32} />
        </div>
        <h3 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1.5">Auction Block Idle</h3>
        <p className="text-xs text-[var(--text-secondary)]">Awaiting next player to be called onto the block...</p>
      </div>
    );
  }

  // Convert players to CarouselItems
  const carouselItems: CarouselItem[] = [
    ...(activePlayer ? [{
      id: activePlayer.id,
      title: activePlayer.name,
      subtitle: `${activePlayer.role} · Current Bid`,
      badge: 'LIVE ON BLOCK',
      price: currentBid,
      photoUrl: activePlayer.cricheroesPhotoUrl || activePlayer.photoUrl,
    }] : []),
    ...upcomingPlayers.slice(0, 5).map((p, idx) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.role} · Base Price`,
      badge: `UP NEXT #${idx + 1}`,
      price: p.basePrice,
      photoUrl: p.cricheroesPhotoUrl || p.photoUrl,
    }))
  ];

  const photo = activePlayer?.cricheroesPhotoUrl || activePlayer?.photoUrl;
  const manualStats = activePlayer
    ? (Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[])
        .filter((k) => (activePlayer as any)[k] !== undefined && (activePlayer as any)[k] !== null)
        .map((k) => [STAT_LABELS[k], String((activePlayer as any)[k])] as [string, string])
    : [];
  const scrapedStats = activePlayer?.cricheroesStats ? Object.entries(activePlayer.cricheroesStats) : [];
  const statEntries = scrapedStats.length > 0 ? scrapedStats : manualStats;

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center">
      {/* View Switcher Header (8-point rhythm) */}
      <div className="w-full flex items-center justify-between mb-4 px-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          Live Presentation Mode
        </span>
        <div className="flex items-center gap-2 p-1 rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setViewMode('carousel')}
            className={`px-3 py-1 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'carousel'
                ? 'bg-[#c2a365] text-[#0b0a09] shadow'
                : 'text-[var(--text-secondary)] hover:text-[#f2f1ed]'
            }`}
          >
            <Orbit size={13} /> 3D Carousel
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`px-3 py-1 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'card'
                ? 'bg-[#c2a365] text-[#0b0a09] shadow'
                : 'text-[var(--text-secondary)] hover:text-[#f2f1ed]'
            }`}
          >
            <Layers size={13} /> Card Focus
          </button>
        </div>
      </div>

      {/* 3D ROTATING CAROUSEL VIEW */}
      {viewMode === 'carousel' ? (
        <div className="w-full rounded-[16px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 shadow-2xl">
          <RotatingCarousel
            items={carouselItems}
            radius={200}
            height={340}
            speed={0.006}
          />
        </div>
      ) : (
        /* TACTICAL CARD SWIPE VIEW */
        <div className="relative w-full max-w-md aspect-[3/4] select-none">
          <motion.div
            style={{ x, y, rotate }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            whileTap={{ scale: 1.01, cursor: 'grabbing' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="relative w-full h-full rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col justify-between cursor-grab"
          >
            {/* Stamps */}
            <motion.div
              style={{ opacity: bidStampOpacity }}
              className="absolute top-8 left-8 z-30 pointer-events-none border-4 border-[#38bdf8] text-[#38bdf8] font-black text-2xl px-3.5 py-1 rounded-[12px] transform -rotate-12 tracking-wider bg-[var(--bg-base)]/90 backdrop-blur-md"
            >
              BID!
            </motion.div>
            <motion.div
              style={{ opacity: passStampOpacity }}
              className="absolute top-8 right-8 z-30 pointer-events-none border-4 border-[#ef4444] text-[#ef4444] font-black text-2xl px-3.5 py-1 rounded-[12px] transform rotate-12 tracking-wider bg-[var(--bg-base)]/90 backdrop-blur-md"
            >
              PASS
            </motion.div>

            {/* Photo */}
            <div className="relative w-full h-[55%] bg-[var(--bg-base)] overflow-hidden">
              {photo ? (
                <img
                  src={photo}
                  alt={activePlayer?.name}
                  className="w-full h-full object-cover object-top filter brightness-105 pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-secondary)]">
                  <User size={64} strokeWidth={1.5} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent pointer-events-none" />

              <div className="absolute top-4 left-4 z-10">
                <span className="px-3 py-1 rounded-[8px] text-xs font-bold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[#38bdf8] shadow flex items-center gap-1.5 uppercase tracking-wider">
                  <Award size={12} />
                  {activePlayer?.role}
                </span>
              </div>
            </div>

            {/* Meta */}
            <div className="p-6 flex flex-col justify-between flex-1 bg-[var(--bg-surface)] relative">
              <div>
                <h3 className="text-2xl font-display font-bold text-[var(--text-primary)] tracking-tight truncate">
                  {activePlayer?.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                  <span>Leading:</span>
                  {highestBidderTeam ? (
                    <span className="font-bold text-[#c2a365]">{highestBidderTeam.name}</span>
                  ) : (
                    <span className="italic">Base Price</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-0.5">Current Bid</span>
                  <div className="text-2xl font-black font-mono text-[#38bdf8] tabular-nums">
                    {currentBid} L
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isBidDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    AudioEngine.playBidSound();
                    onBid();
                  }}
                  className="px-5 py-2.5 rounded-[12px] bg-[#38bdf8] hover:bg-[#0284c7] disabled:opacity-40 text-[#0b0a09] font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 focus-ring"
                >
                  Place Bid
                </button>
              </div>

              {/* Unmistakable Confirmation Boundary on Swipe */}
              {stagedConfirm && (
                <div className="absolute inset-x-4 bottom-4 z-40 p-3 rounded-[12px] bg-[var(--bg-elevated)] border-2 border-[#38bdf8] shadow-2xl flex items-center justify-between gap-2 animate-in fade-in">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Confirm Bid Placement?</div>
                    <div className="text-[10px] text-[var(--text-secondary)] font-mono">Amount: {currentBid} Lakhs</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagedConfirm(false);
                        AudioEngine.playBidSound();
                        onBid();
                      }}
                      className="px-3 py-1.5 rounded-[8px] bg-[#38bdf8] text-[#0b0a09] font-black text-xs transition-colors flex items-center gap-1 focus-ring"
                    >
                      <Check size={12} /> Confirm
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagedConfirm(false);
                      }}
                      className="px-2.5 py-1.5 rounded-[8px] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-white text-xs transition-colors flex items-center gap-1 focus-ring border border-[var(--border-subtle)]"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
