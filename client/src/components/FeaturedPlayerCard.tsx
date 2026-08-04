import React from 'react';
import { User, ExternalLink, Loader2 } from 'lucide-react';
import type { Player } from '../hooks/useAuction';

// Shown wherever a player is "on the block": Bidder Terminal, Spectator
// view, Broadcast overlay, Admin console. Pulls from whichever data is
// available - a synced CricHeroes photo/stats block takes priority, with
// organizer-entered CSV stats and a plain photoUrl as fallbacks - so the
// card still looks complete even for players without a CricHeroes link, or
// while a sync is still pending/has failed.

interface FeaturedPlayerCardProps {
  player: Player;
  size?: 'compact' | 'large';
}

const STAT_LABELS: Record<string, string> = {
  runs: 'Runs',
  wickets: 'Wickets',
  average: 'Average',
  strikeRate: 'Strike Rate',
  economy: 'Economy',
  matches: 'Matches',
};

export const FeaturedPlayerCard: React.FC<FeaturedPlayerCardProps> = ({ player, size = 'large' }) => {
  const photo = player.cricheroesPhotoUrl || player.photoUrl;

  const manualStats = (Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[])
    .filter((k) => (player as any)[k] !== undefined && (player as any)[k] !== null)
    .map((k) => [STAT_LABELS[k], String((player as any)[k])] as [string, string]);

  const scrapedStats = player.cricheroesStats ? Object.entries(player.cricheroesStats) : [];
  // Prefer scraped stats when both exist for the same label, otherwise show both sets.
  const statEntries = scrapedStats.length > 0 ? scrapedStats : manualStats;

  const photoBoxSize = size === 'large' ? 'w-32 h-32' : 'w-16 h-16';

  return (
    <div className="glass-panel flex gap-4 items-start">
      <div className={`${photoBoxSize} shrink-0 rounded overflow-hidden bg-[rgba(0,0,0,0.4)] flex items-center justify-center`}>
        {photo ? (
          <img src={photo} alt={player.name} className="w-full h-full object-cover" />
        ) : (
          <User size={size === 'large' ? 48 : 28} className="text-secondary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className={size === 'large' ? 'text-2xl font-bold' : 'text-base font-bold'}>{player.name}</h3>
          {player.cricheroesStatus === 'pending' && (
            <span className="text-xs text-secondary flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> syncing CricHeroes...
            </span>
          )}
          {player.cricheroesStatus === 'failed' && (
            <span className="text-xs text-danger" title={player.cricheroesError}>
              CricHeroes sync failed
            </span>
          )}
        </div>
        <div className="text-secondary text-sm mb-2">{player.role} · Base {player.basePrice} L</div>

        {statEntries.length > 0 && (
          <div className="flex gap-x-4 gap-y-1 flex-wrap text-sm">
            {statEntries.map(([label, value]) => (
              <div key={label}>
                <span className="text-secondary">{label}: </span>
                <span className="font-mono text-neon">{value}</span>
              </div>
            ))}
          </div>
        )}

        {player.cricheroesUrl && (
          <a
            href={player.cricheroesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-secondary hover:text-neon inline-flex items-center gap-1 mt-2"
          >
            View full CricHeroes profile <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
};
