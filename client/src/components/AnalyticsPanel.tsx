import React, { useMemo } from 'react';
import { BarChart3, Flame, Award, DollarSign, PieChart, TrendingUp, ChevronRight } from 'lucide-react';
import type { Player, Team } from '../hooks/useAuction';

interface AnalyticsPanelProps {
  teams: Team[];
  players: Player[];
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ teams, players }) => {
  const stats = useMemo(() => {
    const sold = players.filter((p) => p.status === 'sold' && p.soldPrice != null);
    const unsold = players.filter((p) => p.status === 'unsold');
    const available = players.filter((p) => p.status === 'available');

    const totalSpend = sold.reduce((sum, p) => sum + (p.soldPrice || 0), 0);

    const priciest = [...sold].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0)).slice(0, 4);
    const valuePicks = [...sold]
      .filter((p) => p.soldPrice != null)
      .sort((a, b) => ((a.soldPrice || 0) - a.basePrice) - ((b.soldPrice || 0) - b.basePrice))
      .slice(0, 4);

    const roleSpend = new Map<string, { count: number; spend: number }>();
    sold.forEach((p) => {
      const cur = roleSpend.get(p.role) || { count: 0, spend: 0 };
      cur.count += 1;
      cur.spend += p.soldPrice || 0;
      roleSpend.set(p.role, cur);
    });

    return { sold, unsold, available, totalSpend, priciest, valuePicks, roleSpend };
  }, [players]);

  return (
    <div className="bg-[#111827] border border-[rgba(242,241,237,0.08)] rounded-[16px] p-6 sm:p-8 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between pb-4 mb-6 border-b border-[rgba(242,241,237,0.08)] gap-2">
        <div>
          <h2 className="font-display font-semibold text-2xl text-[#f2f1ed] flex items-center gap-2.5">
            <BarChart3 className="text-sky-400" size={22} /> Auction Intelligence &amp; Analytics
          </h2>
          <p className="text-xs text-[#8c8a82] mt-1">
            Real-time financial telemetry, role-wise allocation, and valuation spreads.
          </p>
        </div>
        <div className="px-3 py-1 rounded-lg bg-[#0b0a09] border border-[rgba(242,241,237,0.08)] text-xs font-mono font-bold text-sky-400">
          Telemetry Active
        </div>
      </div>

      {/* OVERVIEW STAT CARDS (8-point rhythm: gap-4, mb-8) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat
          label="Total Purse Spent"
          value={`${stats.totalSpend} L`}
          subtext="Cumulative across teams"
          icon={<DollarSign size={20} className="text-emerald-400" />}
        />
        <Stat
          label="Players Acquired"
          value={`${stats.sold.length}`}
          subtext={`Out of ${players.length} registered`}
          icon={<Award size={20} className="text-sky-400" />}
        />
        <Stat
          label="Average Deal Price"
          value={stats.sold.length ? `${Math.round(stats.totalSpend / stats.sold.length)} L` : '0 L'}
          subtext="Mean valuation per sold lot"
          icon={<TrendingUp size={20} className="text-amber-400" />}
        />
        <Stat
          label="Unsold Inventory"
          value={`${stats.unsold.length}`}
          subtext={`${stats.available.length} awaiting call`}
          icon={<PieChart size={20} className="text-rose-400" />}
        />
      </div>

      {/* PRICIEST & VALUE PICKS (8-point rhythm: gap-6) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Highest Signings */}
        <div className="bg-[#0b0a09] border border-[rgba(242,241,237,0.08)] rounded-[16px] p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[rgba(242,241,237,0.08)]">
            <Flame size={16} className="text-amber-400" />
            <h3 className="font-display font-semibold text-sm text-[#f2f1ed]">Marquee Deals (Top Valuations)</h3>
          </div>
          <div className="space-y-2">
            {stats.priciest.map((p) => {
              const team = teams.find((t) => t.id === p.teamId || t.players.some((pl) => pl.id === p.id));
              return (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-[#111827] border border-[rgba(242,241,237,0.08)] text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-[#f2f1ed] truncate">{p.name}</div>
                    <div className="text-[10px] text-[#8c8a82]">
                      {p.role} · <span className="text-sky-300 font-semibold">{team?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-black text-amber-400 tabular-nums">
                      {p.soldPrice} L
                    </span>
                  </div>
                </div>
              );
            })}
            {stats.priciest.length === 0 && (
              <div className="text-center text-xs text-[#8c8a82] py-8">No signed players yet.</div>
            )}
          </div>
        </div>

        {/* Tactical Value Picks */}
        <div className="bg-[#0b0a09] border border-[rgba(242,241,237,0.08)] rounded-[16px] p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[rgba(242,241,237,0.08)]">
            <Award size={16} className="text-[#c2a365]" />
            <h3 className="font-display font-semibold text-sm text-[#f2f1ed]">Tactical Value Deals</h3>
          </div>
          <div className="space-y-2">
            {stats.valuePicks.map((p) => {
              const team = teams.find((t) => t.id === p.teamId || t.players.some((pl) => pl.id === p.id));
              const premium = (p.soldPrice || 0) - p.basePrice;
              return (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-[#111827] border border-[rgba(242,241,237,0.08)] text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-[#f2f1ed] truncate">{p.name}</div>
                    <div className="text-[10px] text-[#8c8a82]">
                      {p.role} · <span className="text-sky-300 font-semibold">{team?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-sky-400 tabular-nums">{p.soldPrice} L</div>
                    <div className="text-[10px] text-[#8c8a82] font-mono">+{premium}L over base</div>
                  </div>
                </div>
              );
            })}
            {stats.valuePicks.length === 0 && (
              <div className="text-center text-xs text-[#8c8a82] py-8">No deals finalized yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* ROLE ALLOCATION BREAKDOWN */}
      <div className="bg-[#0b0a09] border border-[rgba(242,241,237,0.08)] rounded-[16px] p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[rgba(242,241,237,0.08)]">
          <PieChart size={16} className="text-sky-400" />
          <h3 className="font-display font-semibold text-sm text-[#f2f1ed]">Capital Allocation by Role</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'].map((role) => {
            const data = stats.roleSpend.get(role) || { count: 0, spend: 0 };
            const percent = stats.totalSpend > 0 ? Math.round((data.spend / stats.totalSpend) * 100) : 0;
            return (
              <div key={role} className="p-4 rounded-xl bg-[#111827] border border-[rgba(242,241,237,0.08)] flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-[#f2f1ed]">{role}</span>
                  <span className="font-mono text-xs font-bold text-sky-400 tabular-nums">{percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0b0a09] rounded-full overflow-hidden border border-[rgba(242,241,237,0.08)] mb-2">
                  <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-[#8c8a82]">
                  <span>{data.count} players</span>
                  <span className="font-mono font-semibold">{data.spend} L</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; subtext: string; icon: React.ReactNode }> = ({
  label,
  value,
  subtext,
  icon,
}) => (
  <div className="bg-[#0b0a09] border border-[rgba(242,241,237,0.08)] rounded-[16px] p-5 flex flex-col justify-between shadow-sm">
    <div className="flex justify-between items-start mb-2">
      <span className="text-xs font-semibold text-[#8c8a82] uppercase tracking-wider">{label}</span>
      <div className="p-1.5 rounded-lg bg-[#111827] border border-[rgba(242,241,237,0.08)]">{icon}</div>
    </div>
    <div>
      <div className="text-2xl sm:text-3xl font-black font-mono text-[#f2f1ed] tracking-tight tabular-nums mb-1">
        {value}
      </div>
      <div className="text-[11px] text-[#8c8a82]">{subtext}</div>
    </div>
  </div>
);
