import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, X, Play, Activity, Award, Swords, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Team {
  id: string;
  name: string;
  rating?: number; // 0-100
}

interface Match {
  id: string;
  team1: Team | null;
  team2: Team | null;
  winner: Team | null;
  status: 'pending' | 'playing' | 'completed';
  logs: string[];
}

interface TournamentSimulatorProps {
  teams: Team[];
  onClose: () => void;
}

export const TournamentSimulator: React.FC<TournamentSimulatorProps> = ({ teams, onClose }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    // Initialize simple bracket
    const initialMatches: Match[] = [];
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        initialMatches.push({
          id: `Semi Final ${i / 2 + 1}`,
          team1: teams[i],
          team2: teams[i + 1],
          winner: null,
          status: 'pending',
          logs: [],
        });
      }
    }

    if (initialMatches.length >= 2) {
      initialMatches.push({
        id: 'Grand Final',
        team1: null,
        team2: null,
        winner: null,
        status: 'pending',
        logs: [],
      });
    } else if (initialMatches.length === 1) {
      initialMatches[0].id = 'Grand Final';
    }
    setMatches(initialMatches);
  }, [teams]);

  const startSimulation = () => {
    setCurrentMatchIndex(0);
  };

  useEffect(() => {
    if (currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
      const match = matches[currentMatchIndex];
      if (match.status === 'pending') {
        if (!match.team1 || !match.team2) {
          const m = [...matches];
          if (match.id === 'Grand Final' && matches.length >= 3) {
            match.team1 = matches[0].winner;
            match.team2 = matches[1].winner;
            setMatches(m);
            if (!match.team1 || !match.team2) return;
          } else {
            setCurrentMatchIndex((c) => c + 1);
            return;
          }
        }

        const m = [...matches];
        m[currentMatchIndex].status = 'playing';
        m[currentMatchIndex].logs = ['Match underway! Players taking positions on the pitch.'];
        setMatches(m);

        let over = 1;
        const interval = setInterval(() => {
          setMatches((prev) => {
            const newMatches = [...prev];
            const current = newMatches[currentMatchIndex];

            if (over <= 5) {
              const eventRandom = Math.random();
              let log = '';
              const battingTeam = eventRandom > 0.5 ? current.team1!.name : current.team2!.name;
              if (eventRandom > 0.8) log = `Over ${over}: ${battingTeam} powers a towering SIX over long-on! 🔥`;
              else if (eventRandom > 0.6) log = `Over ${over}: Timber! Crucial wicket falls for ${battingTeam}! 💥`;
              else log = `Over ${over}: Pushed into the gap by ${battingTeam} for a sharp single.`;

              current.logs.push(log);
              over++;
            } else {
              clearInterval(interval);
              const t1Score = (current.team1!.rating || 75) * (0.8 + Math.random() * 0.4);
              const t2Score = (current.team2!.rating || 75) * (0.8 + Math.random() * 0.4);
              const winner = t1Score > t2Score ? current.team1 : current.team2;

              current.winner = winner;
              current.status = 'completed';
              current.logs.push(`🏆 Match Decision: ${winner!.name} claims victory and advances!`);

              setTimeout(() => {
                setCurrentMatchIndex((c) => c + 1);
              }, 1500);
            }
            return newMatches;
          });
        }, 850);
      }
    } else if (currentMatchIndex === matches.length && matches.length > 0) {
      const finalMatch = matches[matches.length - 1];
      if (finalMatch.winner && finalMatch.status === 'completed') {
        confetti({
          particleCount: 200,
          spread: 110,
          origin: { y: 0.5 },
        });
      }
    }
  }, [currentMatchIndex, matches]);

  const champion = matches.length > 0 && currentMatchIndex === matches.length ? matches[matches.length - 1].winner : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl p-4 sm:p-6 flex flex-col overflow-y-auto font-sans">
      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col my-auto">
        {/* MODAL CARD CONTAINER */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-prominent)] rounded-3xl p-6 sm:p-8 shadow-2xl flex-1 flex flex-col">
          {/* HEADER */}
          <div className="flex justify-between items-center pb-4 mb-6 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Trophy size={22} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Playoff Tournament Simulator</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Simulating knockouts using squad valuations and balance metrics
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-[var(--border-subtle)] text-slate-300 transition-colors focus-ring"
              title="Close modal (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* SIMULATION TRIGGER BUTTON */}
          {matches.length > 0 && currentMatchIndex === -1 && (
            <div className="mb-6 text-center">
              <button
                onClick={startSimulation}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 mx-auto focus-ring"
              >
                <Play size={16} /> Launch Playoff Bracket
              </button>
            </div>
          )}

          {/* BRACKET & COMMENTARY GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[380px]">
            {/* BRACKET TREE */}
            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-4 flex items-center gap-1.5">
                  <Award size={14} /> Knockout Bracket
                </h3>
                <div className="space-y-3.5">
                  {matches.map((m) => (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border transition-all ${
                        m.status === 'playing'
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-lg'
                          : m.status === 'completed'
                          ? 'bg-slate-900 border-slate-700/60'
                          : 'bg-slate-950/60 border-[var(--border-subtle)]'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-2 flex items-center justify-between">
                        <span>{m.id}</span>
                        {m.status === 'playing' && (
                          <span className="text-amber-400 flex items-center gap-1 text-[9px] font-black">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> LIVE
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className={m.winner?.id === m.team1?.id ? 'text-amber-400 font-black' : 'text-slate-200'}>
                          {m.team1 ? m.team1.name : 'TBD'}
                        </span>
                        <span className="text-slate-500 text-xs italic mx-2">vs</span>
                        <span className={m.winner?.id === m.team2?.id ? 'text-amber-400 font-black' : 'text-slate-200'}>
                          {m.team2 ? m.team2.name : 'TBD'}
                        </span>
                      </div>
                      {m.winner && (
                        <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] text-xs font-black text-emerald-400 flex items-center gap-1.5">
                          <Trophy size={13} /> Winner: {m.winner.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-4 text-center">
                Squad ratings derived from signed player ratings &amp; auction cap allocation.
              </div>
            </div>

            {/* LIVE PLAY-BY-PLAY COMMENTARY FEED */}
            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl p-5 flex flex-col justify-between">
              <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider mb-4 flex items-center gap-1.5">
                <Activity size={14} /> Over-by-Over Commentary
              </h3>

              {currentMatchIndex >= 0 && currentMatchIndex < matches.length && (
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="font-bold text-xs text-amber-300 pb-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <span>
                      {matches[currentMatchIndex].id}: {matches[currentMatchIndex].team1?.name} vs{' '}
                      {matches[currentMatchIndex].team2?.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Match {currentMatchIndex + 1}/{matches.length}</span>
                  </div>
                  <div className="space-y-2 my-3 flex-1 overflow-y-auto max-h-64 pr-1">
                    {matches[currentMatchIndex].logs.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-slate-200 font-mono"
                      >
                        {log}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {champion && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-amber-500/10 rounded-2xl border border-amber-500/40"
                >
                  <Trophy size={44} className="text-amber-400 mb-2 animate-bounce" />
                  <div className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">
                    TOURNAMENT CHAMPION
                  </div>
                  <div className="text-2xl font-black text-white">{champion.name}</div>
                </motion.div>
              )}

              {currentMatchIndex === -1 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-[var(--text-tertiary)] p-6">
                  <Swords size={32} className="text-slate-600 mb-2" />
                  <span>Click "Launch Playoff Bracket" above to initiate simulation.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

