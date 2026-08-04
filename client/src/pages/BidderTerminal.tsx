import React, { useState } from 'react';
import { useAuction, Role } from '../hooks/useAuction';
import { PitchRoster } from '../components/PitchRoster';
import { TinderCardStack } from '../components/TinderCardStack';
import { FloatingReactions } from '../components/FloatingReactions';
import { AudioEngine } from '../components/AudioEngine';
import { AIAuctioneer } from '../components/AIAuctioneer';
import { Volume2, VolumeX, Shield, DollarSign, Users, Award, Flame, Sparkles, PieChart, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BidderTerminalProps {
  roomId: string;
  token?: string | null;
  role: Role;
  teamId?: string | null;
}

export const BidderTerminal: React.FC<BidderTerminalProps> = ({ roomId, token, role, teamId }) => {
  const auction = useAuction({ roomId, token, role, teamId });
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'squad' | 'pitch' | 'budget'>('squad');
  const [budgetNotes, setBudgetNotes] = useState('');

  const team = auction.teams.find((t) => t.id === teamId);

  if (!teamId || !token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-950 text-slate-100">
        <Shield size={64} className="text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-3xl font-bold text-rose-500 mb-2">Missing Team Link</h2>
        <p className="text-slate-400 max-w-md">
          This looks like an incomplete or broken team link. Please ask the auction organizer to send your private team access link.
        </p>
      </div>
    );
  }

  if (auction.connectionStatus === 'connecting' && !team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-400 gap-3">
        <RefreshCw size={32} className="animate-spin text-amber-400" />
        <span className="text-sm font-semibold tracking-wider uppercase">Connecting to Auction Arena...</span>
      </div>
    );
  }

  if (!audioEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-950 text-slate-100 gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full p-8 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-[rgba(255,255,255,0.1)] shadow-2xl flex flex-col items-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-500 p-0.5 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
              <Sparkles size={40} />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">{team?.name || 'Team Terminal'}</h2>
          <p className="text-sm text-slate-400 mb-6">
            Swipeable Tinder-style player cards, instant haptic bidding, dynamic pitch map, and live AI voice auctioneer.
          </p>

          <button
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            onClick={() => {
              AudioEngine.init();
              AIAuctioneer.init();
              setAudioEnabled(true);
            }}
          >
            <Volume2 size={18} /> Enter Live Auction Deck
          </button>
        </motion.div>
      </div>
    );
  }

  const currentVal = auction.currentBid > 0 ? auction.currentBid : (auction.activePlayer?.basePrice || 0);
  const highestBidderTeam = auction.teams.find((t) => t.id === auction.highestBidder);
  const isHighestBidder = auction.highestBidder === teamId;
  const purse = team?.purse ?? 0;

  // Next standard tier increment
  const nextIncrement = (() => {
    const tier = auction.rules.incrementTiers.find((t) => currentVal < t.upTo);
    return tier ? tier.increment : 5;
  })();
  const nextBidAmount = currentVal + nextIncrement;
  const canAfford = purse >= nextBidAmount;
  const isBidDisabled = isHighestBidder || !canAfford || !auction.activePlayer;

  // Purse usage percentage for visual gauge
  const initialPurse = 1000;
  const spent = initialPurse - purse;
  const spentPercent = Math.min(100, Math.max(0, (spent / initialPurse) * 100));

  // Upcoming players queue for Tinder card stack
  const upcomingPlayers = auction.players.filter((p) => p.status === 'available' && p.id !== auction.activePlayer?.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative font-sans">
      {/* Floating Emoji Reactions Layer */}
      <FloatingReactions reactions={auction.reactionEmojiList} />

      {/* TOP NAVBAR / TEAM PURSE STATUS */}
      <header className="p-4 bg-slate-900/90 backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)] z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-emerald-500 p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-amber-400 text-sm">
                {team?.code || 'TM'}
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-tight">{team?.name}</h1>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
                Team Bidder Terminal
              </span>
            </div>
          </div>

          {/* PURSE BALANCE & PROGRESS GAUGE */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining Purse</div>
              <div className="text-2xl font-black font-mono text-emerald-400 flex items-center justify-end gap-1">
                <DollarSign size={18} className="text-emerald-400" />
                {purse} L
              </div>
            </div>

            {/* Purse Progress Bar */}
            <div className="hidden sm:block w-32">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                <span>Spent</span>
                <span>{spentPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500"
                  style={{ width: `${spentPercent}%` }}
                />
              </div>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                AIAuctioneer.toggle();
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
              title="Toggle AI Auctioneer Voice"
            >
              <Volume2 size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto z-10">
        {/* LEFT / CENTER: TINDER PLAYER CARD STACK & BIDDING CONTROLS (8 Cols) */}
        <section className="lg:col-span-7 flex flex-col justify-between gap-6">
          {/* TINDER CARD STACK */}
          <div className="flex-1 flex items-center justify-center min-h-[420px]">
            <TinderCardStack
              activePlayer={auction.activePlayer}
              upcomingPlayers={upcomingPlayers}
              currentBid={auction.currentBid}
              highestBidderTeam={highestBidderTeam}
              onBid={() => auction.placeBid(nextBidAmount)}
              onPass={() => {}}
              onReaction={(emoji) => auction.sendReaction(emoji)}
              isBidDisabled={isBidDisabled}
              disabledReason={
                isHighestBidder
                  ? 'You hold highest bid!'
                  : !canAfford
                  ? 'Insufficient purse balance'
                  : 'Waiting for player'
              }
            />
          </div>

          {/* INSTANT BIDDING DASHBOARD */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-5 shadow-2xl">
            {/* MAIN INSTANT BID BUTTON */}
            <motion.button
              whileHover={{ scale: isBidDisabled ? 1 : 1.02 }}
              whileTap={{ scale: isBidDisabled ? 1 : 0.96 }}
              disabled={isBidDisabled}
              onClick={() => {
                if (!isBidDisabled) {
                  AudioEngine.playBidSound();
                  auction.placeBid(nextBidAmount);
                }
              }}
              className={`w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden ${
                isHighestBidder
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 cursor-not-allowed'
                  : isBidDisabled
                  ? 'bg-slate-800/60 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.4)] hover:shadow-[0_0_50px_rgba(16,185,129,0.6)]'
              }`}
            >
              {isHighestBidder ? (
                <>
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  You Hold Highest Bid ({currentVal} L)
                </>
              ) : !canAfford ? (
                'Purse Limit Reached'
              ) : auction.activePlayer ? (
                <>
                  <Sparkles size={24} />
                  PLACE BID — {nextBidAmount} Lakhs
                </>
              ) : (
                'Waiting for Next Player...'
              )}
            </motion.button>

            {/* QUICK INCREMENT PILLS */}
            <div className="grid grid-cols-4 gap-2.5 mt-3">
              {[5, 10, 25, 50].map((inc) => {
                const targetBid = currentVal + inc;
                const isDisabled = isBidDisabled || purse < targetBid;
                return (
                  <button
                    key={inc}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        AudioEngine.playBidSound();
                        auction.placeBid(targetBid);
                      }
                    }}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all duration-200 border ${
                      isDisabled
                        ? 'bg-slate-950/40 text-slate-600 border-slate-800 cursor-not-allowed'
                        : 'bg-slate-800/90 text-amber-300 border-amber-500/30 hover:border-amber-400 hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-sm'
                    }`}
                  >
                    +{inc}L ({targetBid}L)
                  </button>
                );
              })}
            </div>

            {/* FLOATING REACTION BAR */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Flame size={14} className="text-amber-400" /> Send Live Reaction:
              </span>
              <div className="flex gap-2">
                {['🔥', '💰', '😱', '⚡️', '👑'].map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2, rotate: 8 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      AudioEngine.playCheerSound();
                      auction.sendReaction(emoji);
                    }}
                    className="w-10 h-10 rounded-xl bg-slate-800/90 border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-lg hover:bg-slate-700 transition-colors shadow-md"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT: TABBED SQUAD ROSTER, PITCH MAP & BUDGET PLANNER (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* TAB SELECTION HEADER */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl p-1.5 flex gap-1">
            <button
              onClick={() => setSidebarTab('squad')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'squad'
                  ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users size={14} /> Squad ({team?.players.length ?? 0})
            </button>
            <button
              onClick={() => setSidebarTab('pitch')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'pitch'
                  ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Award size={14} /> Tactical Pitch Map
            </button>
            <button
              onClick={() => setSidebarTab('budget')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'budget'
                  ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <PieChart size={14} /> Budget Planner
            </button>
          </div>

          {/* TAB CONTENT CONTAINER */}
          <div className="flex-1 min-h-[460px] bg-slate-900/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col">
            {sidebarTab === 'squad' && (
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Signed Players</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Total Spent: {spent} L
                  </span>
                </div>

                {team?.players && team.players.length > 0 ? (
                  <ul className="space-y-2.5 flex-1">
                    {team.players.map((p) => (
                      <motion.li
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-950/60 border border-[rgba(255,255,255,0.05)] flex items-center justify-between hover:border-amber-500/30 transition-colors"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-100">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{p.role}</div>
                        </div>
                        <div className="text-sm font-mono font-bold text-amber-400">{p.soldPrice} L</div>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <Users size={40} className="mb-2 opacity-40" />
                    <p className="text-xs">No players acquired yet. Start swiping &amp; bidding on player cards!</p>
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'pitch' && (
              <div className="flex-1 overflow-y-auto">
                <PitchRoster teamName={team?.name || 'Team Roster'} players={team?.players || []} />
              </div>
            )}

            {sidebarTab === 'budget' && (
              <div className="flex-1 flex flex-col gap-3">
                <div className="text-xs text-slate-400 font-medium">
                  Private strategy worksheet for target player valuations:
                </div>
                <textarea
                  className="flex-1 w-full bg-slate-950/80 text-slate-100 border border-[rgba(255,255,255,0.1)] rounded-2xl p-4 text-xs font-mono outline-none focus:border-amber-400 transition-colors resize-none placeholder:text-slate-600"
                  placeholder="Target Wishlist:&#10;- Virat Kohli (Max 250L)&#10;- Jasprit Bumrah (Max 300L)&#10;- Rashid Khan (Max 180L)"
                  value={budgetNotes}
                  onChange={(e) => setBudgetNotes(e.target.value)}
                />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
