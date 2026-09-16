import React, { useMemo } from 'react';
import { Award, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface Player {
  id: string;
  name: string;
  role: string;
  basePrice: number;
  rating?: number;
  soldPrice?: number;
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
    <div className="flex flex-col gap-4 w-full h-full text-[#f2f1ed] font-sans">
      {/* SQUAD RATINGS & CHEMISTRY SUMMARY (Boxy 16px geometry) */}
      <div className="bg-[#111827] border border-[rgba(242,241,237,0.08)] rounded-[16px] p-4 shadow-xl">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-display font-semibold text-sm text-[#f2f1ed] flex items-center gap-2">
            <Award size={15} className="text-sky-400" /> {teamName} Squad Balance
          </h3>
          <span className="text-xs font-mono font-bold text-sky-400 tabular-nums">Rating: {avgRating}</span>
        </div>

        {/* Chemistry gauge bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-[#8c8a82] font-semibold mb-1">
            <span>Squad Chemistry</span>
            <span className="font-mono tabular-nums">{chemistryIndex}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#0b0a09] rounded-full overflow-hidden border border-[rgba(242,241,237,0.08)]">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-300"
              style={{ width: `${chemistryIndex}%` }}
            />
          </div>
        </div>

        {/* Tactical role breakdown badges */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-[#0b0a09] rounded-lg p-2 border border-[rgba(242,241,237,0.08)]">
            <div className="text-[10px] text-[#8c8a82] font-bold uppercase">BAT</div>
            <div className="font-mono font-bold text-sky-300 tabular-nums">{batsmen.length}/4</div>
          </div>
          <div className="bg-[#0b0a09] rounded-lg p-2 border border-[rgba(242,241,237,0.08)]">
            <div className="text-[10px] text-[#8c8a82] font-bold uppercase">BOWL</div>
            <div className="font-mono font-bold text-sky-300 tabular-nums">{bowlers.length}/4</div>
          </div>
          <div className="bg-[#0b0a09] rounded-lg p-2 border border-[rgba(242,241,237,0.08)]">
            <div className="text-[10px] text-[#8c8a82] font-bold uppercase">AR</div>
            <div className="font-mono font-bold text-sky-300 tabular-nums">{allRounders.length}/2</div>
          </div>
          <div className="bg-[#0b0a09] rounded-lg p-2 border border-[rgba(242,241,237,0.08)]">
            <div className="text-[10px] text-[#8c8a82] font-bold uppercase">WK</div>
            <div className="font-mono font-bold text-sky-300 tabular-nums">{wicketKeepers.length}/1</div>
          </div>
        </div>
      </div>

      {/* PITCH VISUALIZER (Boxy 16px geometry) */}
      <div className="relative flex-1 min-h-[300px] bg-[#111827] border border-[rgba(242,241,237,0.08)] rounded-[16px] overflow-hidden p-4 flex flex-col justify-between shadow-2xl">
        {/* Subtle Pitch Grass Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        {/* BATSMEN ZONE */}
        <div className="relative z-10">
          <span className="text-[10px] uppercase font-bold text-[#8c8a82] tracking-wider block mb-1.5">
            Top Order &amp; Batsmen ({batsmen.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {batsmen.map((p) => (
              <div
                key={p.id}
                className="px-2.5 py-1 rounded-lg bg-[#0b0a09] border border-sky-500/30 text-xs text-[#f2f1ed] flex items-center gap-1.5 shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="font-semibold truncate max-w-[110px]">{p.name}</span>
                {p.soldPrice && <span className="font-mono text-[10px] text-sky-400 tabular-nums">({p.soldPrice}L)</span>}
              </div>
            ))}
            {batsmen.length === 0 && <span className="text-xs text-[#8c8a82] italic">No batsmen signed yet</span>}
          </div>
        </div>

        {/* ALL-ROUNDERS & WICKETKEEPERS ZONE */}
        <div className="relative z-10 my-2">
          <span className="text-[10px] uppercase font-bold text-[#8c8a82] tracking-wider block mb-1.5">
            Core Utility ({allRounders.length + wicketKeepers.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {wicketKeepers.map((p) => (
              <div
                key={p.id}
                className="px-2.5 py-1 rounded-lg bg-[#0b0a09] border border-amber-500/30 text-xs text-[#f2f1ed] flex items-center gap-1.5 shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="font-semibold truncate max-w-[110px]">{p.name} (WK)</span>
              </div>
            ))}
            {allRounders.map((p) => (
              <div
                key={p.id}
                className="px-2.5 py-1 rounded-lg bg-[#0b0a09] border border-indigo-500/30 text-xs text-[#f2f1ed] flex items-center gap-1.5 shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="font-semibold truncate max-w-[110px]">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BOWLERS ZONE */}
        <div className="relative z-10">
          <span className="text-[10px] uppercase font-bold text-[#8c8a82] tracking-wider block mb-1.5">
            Bowling Attack ({bowlers.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {bowlers.map((p) => (
              <div
                key={p.id}
                className="px-2.5 py-1 rounded-lg bg-[#0b0a09] border border-emerald-500/30 text-xs text-[#f2f1ed] flex items-center gap-1.5 shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-semibold truncate max-w-[110px]">{p.name}</span>
                {p.soldPrice && <span className="font-mono text-[10px] text-emerald-400 tabular-nums">({p.soldPrice}L)</span>}
              </div>
            ))}
            {bowlers.length === 0 && <span className="text-xs text-[#8c8a82] italic">No bowlers signed yet</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
