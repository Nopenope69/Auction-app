import React, { useMemo } from 'react';
import { Award, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';

export interface Player {
  id: string;
  name: string;
  role: string;
  basePrice: number;
  rating?: number;
}

interface PitchRosterProps {
  teamName: string;
  players: Player[];
}

export const PitchRoster: React.FC<PitchRosterProps> = ({ teamName, players }) => {
  const { batsmen, bowlers, allRounders, wicketKeepers } = useMemo(() => {
    return {
      batsmen: players.filter((p) => p.role.toLowerCase() === 'batsman'),
      bowlers: players.filter((p) => p.role.toLowerCase() === 'bowler'),
      allRounders: players.filter((p) => p.role.toLowerCase() === 'all-rounder'),
      wicketKeepers: players.filter(
        (p) => p.role.toLowerCase() === 'wicketkeeper' || p.role.toLowerCase() === 'wicket-keeper'
      ),
    };
  }, [players]);

  const avgRating =
    players.length > 0
      ? (players.reduce((sum, p) => sum + (p.rating || 75), 0) / players.length).toFixed(1)
      : '0.0';

  const chemistryIndex = useMemo(() => {
    let index = 50;
    if (batsmen.length >= 4) index += 10;
    if (bowlers.length >= 4) index += 10;
    if (allRounders.length >= 2) index += 10;
    if (wicketKeepers.length >= 1) index += 10;
    if (players.length >= 11) index += 10;
    return Math.min(100, index);
  }, [batsmen, bowlers, allRounders, wicketKeepers, players]);

  return (
    <div className="flex flex-col gap-4 w-full h-full p-2 text-slate-100 font-sans">
      {/* SQUAD RATINGS & CHEMISTRY SUMMARY */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 shadow-xl">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-black text-sm text-white flex items-center gap-1.5">
            <Award size={16} className="text-amber-400" /> {teamName} Squad Setup
          </h3>
          <span className="text-xs font-mono font-bold text-amber-400">Rating: {avgRating}</span>
        </div>

        {/* Chemistry gauge bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
            <span>Squad Chemistry</span>
            <span>{chemistryIndex}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${chemistryIndex}%` }}
            />
          </div>
        </div>

        {/* Balance Warnings */}
        <div className="space-y-1 text-[11px] font-semibold text-amber-300">
          {wicketKeepers.length === 0 && (
            <p className="flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-400 shrink-0" /> Missing Wicketkeeper!
            </p>
          )}
          {batsmen.length < 4 && (
            <p className="flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-400 shrink-0" /> Need more batsmen ({batsmen.length}/4)
            </p>
          )}
          {bowlers.length < 4 && (
            <p className="flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-400 shrink-0" /> Need more bowlers ({bowlers.length}/4)
            </p>
          )}
          {players.length > 0 && players.length < 11 && (
            <p className="flex items-center gap-1 text-slate-400">
              <ShieldCheck size={12} className="text-emerald-400 shrink-0" /> Squad understaffed ({players.length}/11)
            </p>
          )}
        </div>
      </div>

      {/* GRAPHICAL PITCH OVAL */}
      <div className="relative flex-1 min-h-[380px] rounded-3xl bg-gradient-to-b from-emerald-900/40 via-emerald-950/60 to-slate-950 border-2 border-emerald-500/30 overflow-hidden flex items-center justify-center p-4 shadow-2xl">
        {/* Grass texture lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        {/* Pitch Rectangle Block */}
        <div className="absolute w-20 h-52 bg-amber-200/20 border border-amber-400/40 rounded-sm flex flex-col justify-between p-2 shadow-inner">
          <div className="w-full h-1 bg-white/60" />
          <div className="w-full h-1 bg-white/60" />
        </div>

        {/* Wicketkeeper */}
        <div className="absolute top-6 flex gap-1.5 flex-wrap justify-center">
          {wicketKeepers.map((p) => (
            <span key={p.id} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 shadow-md">
              🧤 {p.name.split(' ')[0]}
            </span>
          ))}
        </div>

        {/* Batsmen */}
        <div className="absolute top-24 flex gap-1.5 flex-wrap justify-center">
          {batsmen.map((p) => (
            <span key={p.id} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-md">
              🏏 {p.name.split(' ')[0]}
            </span>
          ))}
        </div>

        {/* Bowlers */}
        <div className="absolute bottom-6 flex gap-1.5 flex-wrap justify-center">
          {bowlers.map((p) => (
            <span key={p.id} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-md">
              ⚽ {p.name.split(' ')[0]}
            </span>
          ))}
        </div>

        {/* All-Rounders Left */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
          {allRounders.slice(0, Math.ceil(allRounders.length / 2)).map((p) => (
            <span key={p.id} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500 text-white shadow-md">
              ⭐ {p.name.split(' ')[0]}
            </span>
          ))}
        </div>

        {/* All-Rounders Right */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
          {allRounders.slice(Math.ceil(allRounders.length / 2)).map((p) => (
            <span key={p.id} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500 text-white shadow-md">
              ⭐ {p.name.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
