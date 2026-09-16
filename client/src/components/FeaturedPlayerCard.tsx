import React from 'react';
import { User, ExternalLink, Loader2, Award, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { Player } from '../hooks/useAuction';

interface FeaturedPlayerCardProps {
  player: Player;
  size?: 'compact' | 'large';
}

const STAT_LABELS: Record<string, string> = {
  runs: 'Runs',
  wickets: 'Wickets',
  average: 'Avg',
  strikeRate: 'S/R',
  economy: 'Econ',
  matches: 'Matches',
};

export const FeaturedPlayerCard: React.FC<FeaturedPlayerCardProps> = ({ player, size = 'large' }) => {
  const photo = player.cricheroesPhotoUrl || player.photoUrl;

  const manualStats = (Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[])
    .filter((k) => (player as any)[k] !== undefined && (player as any)[k] !== null)
    .map((k) => [STAT_LABELS[k], String((player as any)[k])] as [string, string]);

  const scrapedStats = player.cricheroesStats ? Object.entries(player.cricheroesStats) : [];
  const statEntries = scrapedStats.length > 0 ? scrapedStats : manualStats;

  // Determine marquee primary stat based on role
  const isBowler = player.role.toLowerCase().includes('bowl');
  const isAllRounder = player.role.toLowerCase().includes('round');
  const isKeeper = player.role.toLowerCase().includes('keeper');

  // Identify marquee stats
  const findStat = (keyMatches: string[]) => {
    return statEntries.find(([lbl]) =>
      keyMatches.some((k) => lbl.toLowerCase().includes(k))
    );
  };

  const primaryStat = isBowler
    ? findStat(['wicket', 'wkts']) || statEntries[0]
    : findStat(['run', 'avg']) || statEntries[0];

  const secondaryStat = isBowler
    ? findStat(['econ', 'strike']) || statEntries[1]
    : isKeeper
    ? findStat(['catch', 'dismis', 'stump']) || findStat(['strike', 's/r']) || statEntries[1]
    : findStat(['strike', 's/r', 'avg']) || statEntries[1];

  // Remaining stats excluding primary/secondary
  const otherStats = statEntries.filter(
    (s) => s !== primaryStat && s !== secondaryStat
  );

  if (size === 'compact') {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[12px] p-3 flex gap-3 items-center shadow-md">
        <div className="w-12 h-12 shrink-0 rounded-[8px] overflow-hidden bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center relative">
          {photo ? (
            <img src={photo} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <User size={20} className="text-[var(--text-secondary)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-display font-bold text-sm text-[var(--text-primary)] truncate">{player.name}</h4>
            <span className="text-[10px] font-mono text-[#38bdf8] font-semibold">{player.role}</span>
          </div>
          <div className="text-xs text-[var(--text-secondary)] font-mono">
            Base: <span className="text-[var(--text-primary)] font-bold">{player.basePrice}L</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] overflow-hidden shadow-2xl flex flex-col md:flex-row items-stretch">
      {/* PORTRAIT PLAYER PHOTO FRAME (Stage Dominant) */}
      <div className="relative w-full md:w-52 lg:w-60 min-h-[200px] md:min-h-[250px] bg-[var(--bg-base)] shrink-0 overflow-hidden flex items-center justify-center border-b md:border-b-0 md:border-r border-[var(--border-subtle)]">
        {photo ? (
          <img
            src={photo}
            alt={player.name}
            className="w-full h-full object-cover object-top filter brightness-[1.03] contrast-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-secondary)] py-12">
            <User size={64} strokeWidth={1.25} />
            <span className="text-[11px] font-mono mt-2 text-[var(--text-secondary)]">Photo Pending</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent md:hidden pointer-events-none" />

        {/* Role Badge in Stage Framing */}
        <div className="absolute top-3 left-3 z-10">
          <span className="px-2.5 py-1 rounded-[6px] text-[11px] font-mono font-bold uppercase tracking-wider bg-[var(--bg-base)]/85 text-[#38bdf8] border border-[#38bdf8]/30 shadow-md backdrop-blur-sm flex items-center gap-1.5">
            <Award size={12} />
            {player.role}
          </span>
        </div>

        {player.cricheroesUrl && (
          <div className="absolute bottom-3 left-3 z-10 hidden md:block">
            <span className="px-2 py-0.5 rounded-[4px] bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm">
              <CheckCircle2 size={10} /> CricHeroes Verified
            </span>
          </div>
        )}
      </div>

      {/* METADATA & MARQUEE STAT STAGE */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
            <div>
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)] tracking-tight leading-tight">
                {player.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Base Price:
                </span>
                <span className="font-mono text-base text-[#38bdf8] font-black tabular-nums">
                  {player.basePrice} Lakhs
                </span>
                {player.previousTeamCode && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#c2a365]/15 text-[#c2a365] border border-[#c2a365]/30">
                    RTM Eligible: {player.previousTeamCode}
                  </span>
                )}
              </div>
            </div>

            {/* Sync status */}
            {player.cricheroesStatus === 'pending' && (
              <span className="text-xs font-medium text-[#38bdf8] flex items-center gap-1 bg-[#38bdf8]/10 px-2 py-1 rounded-[6px]">
                <Loader2 size={12} className="animate-spin" /> Syncing stats...
              </span>
            )}
            {player.cricheroesStatus === 'failed' && (
              <span className="text-xs font-medium text-[#ef4444] flex items-center gap-1 bg-[#ef4444]/10 px-2 py-1 rounded-[6px]" title={player.cricheroesError}>
                <ShieldAlert size={12} /> Sync Unverified
              </span>
            )}
          </div>

          {/* ROLE MARQUEE STATS CALLOUT */}
          {(primaryStat || secondaryStat) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-3.5">
              {primaryStat && (
                <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] p-2.5 shadow-inner">
                  <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider mb-0.5">
                    {primaryStat[0]}
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#c2a365] tabular-nums">
                    {primaryStat[1]}
                  </div>
                </div>
              )}

              {secondaryStat && (
                <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] p-2.5 shadow-inner">
                  <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider mb-0.5">
                    {secondaryStat[0]}
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[var(--text-primary)] tabular-nums">
                    {secondaryStat[1]}
                  </div>
                </div>
              )}

              {otherStats.length > 0 && (
                <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] p-2.5 shadow-inner hidden sm:block">
                  <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider mb-0.5">
                    {otherStats[0][0]}
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[var(--text-primary)] tabular-nums">
                    {otherStats[0][1]}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECONDARY STATS ROW */}
          {otherStats.length > 1 && (
            <div className="flex items-center gap-3 flex-wrap text-xs text-[var(--text-secondary)] py-1">
              {otherStats.slice(1, 5).map(([lbl, val]) => (
                <div key={lbl} className="flex items-center gap-1 font-mono">
                  <span className="text-[11px] text-[var(--text-secondary)] font-sans">{lbl}:</span>
                  <span className="font-bold text-[var(--text-primary)]">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER LINK */}
        {player.cricheroesUrl && (
          <div className="pt-3 border-t border-[var(--border-subtle)] mt-2 flex items-center justify-between">
            <a
              href={player.cricheroesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[#38bdf8] hover:text-[#0284c7] inline-flex items-center gap-1.5 transition-colors focus-ring"
            >
              <span>View Official CricHeroes Career Record</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
