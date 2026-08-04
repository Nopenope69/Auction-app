import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, X, Play, Sparkles, Award } from 'lucide-react';
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
        m[currentMatchIndex].logs = ['Match started! Teams taking the field.'];
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
              if (eventRandom > 0.8) log = `Over ${over}: ${battingTeam} hits a massive SIX into the stands! 🔥`;
              else if (eventRandom > 0.6) log = `Over ${over}: ${battingTeam} loses a crucial wicket! CLEAN BOWLED! 💥`;
              else log = `Over ${over}: Quick single by ${battingTeam}, solid rotation of strike.`;

              current.logs.push(log);
              over++;
            } else {
              clearInterval(interval);
              const t1Score = (current.team1!.rating || 75) * Math.random();
              const t2Score = (current.team2!.rating || 75) * Math.random();
              const winner = t1Score > t2Score ? current.team1 : current.team2;

              current.winner = winner;
              current.status = 'completed';
              current.logs.push(`🏆 Match Over: ${winner!.name} wins and advances!`);

              setTimeout(() => {
                setCurrentMatchIndex((c) => c + 1);
              }, 1500);
            }
            return newMatches;
          });
        }, 900);
      }
    } else if (currentMatchIndex === matches.length && matches.length > 0) {
      const finalMatch = matches[matches.length - 1];
      if (finalMatch.winner && finalMatch.status === 'completed') {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
        });
      }
    }
  }, [currentMatchIndex, matches]);

  const champion = matches.length > 0 && currentMatchIndex === matches.length ? matches[matches.length - 1].winner : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-2xl p-6 flex flex-col overflow-y-auto font-sans">
      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-400" size={32} />
            <div>
              <h2 className="text-2xl font-black text-white">Post-Auction Tournament Simulator</h2>
              <p className="text-xs text-slate-400">Simulating league playoffs based on drafted squad ratings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* SIMULATION TRIGGER BUTTON */}
        {matches.length > 0 && currentMatchIndex === -1 && (
          <div className="mb-6 text-center">
            <button
              onClick={startSimulation}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 mx-auto"
            >
              <Play size={18} /> Launch Playoff Simulation
            </button>
          </div>
        )}

        {/* BRACKET & LIVE COMMENTARY GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          {/* BRACKET TREE */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-5 shadow-2xl flex flex-col">
            <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider mb-4 flex items-center gap-1.5">
              <Award size={16} /> Tournament Bracket
            </h3>
            <div className="space-y-4 flex-1">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    m.status === 'playing'
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-950/60 border-[rgba(255,255,255,0.05)]'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">{m.id}</div>
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
                    <div className="mt-3 text-xs font-black text-emerald-400 flex items-center gap-1">
                      <Trophy size={14} /> Winner: {m.winner.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* LIVE PLAY-BY-PLAY COMMENTARY FEED */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-5 shadow-2xl flex flex-col">
            <h3 className="text-sm font-black uppercase text-emerald-400 tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles size={16} /> Ball-by-Ball Live Commentary
            </h3>

            {currentMatchIndex >= 0 && currentMatchIndex < matches.length && (
              <div className="flex-1 flex flex-col justify-between">
                <div className="font-bold text-sm text-amber-400 pb-2 border-b border-slate-800">
                  {matches[currentMatchIndex].id}: {matches[currentMatchIndex].team1?.name} vs{' '}
                  {matches[currentMatchIndex].team2?.name}
                </div>
                <div className="space-y-2 my-4 flex-1 overflow-y-auto max-h-72">
                  {matches[currentMatchIndex].logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-xl bg-slate-950/70 border border-[rgba(255,255,255,0.04)] text-xs text-slate-200 font-mono"
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
                className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-amber-500/20 to-slate-950 rounded-2xl border border-amber-500/40"
              >
                <Trophy size={48} className="text-amber-400 mb-2 animate-bounce" />
                <h3 className="text-2xl font-black text-amber-400 mb-1">TOURNAMENT CHAMPION!</h3>
                <div className="text-3xl font-black text-white">{champion.name}</div>
              </motion.div>
            )}

            {currentMatchIndex === -1 && (
              <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-500 p-8">
                Click "Launch Playoff Simulation" to start match commentary.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
