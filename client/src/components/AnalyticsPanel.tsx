import React, { useMemo } from 'react';
import { BarChart3, Flame, Award, DollarSign, PieChart, TrendingUp } from 'lucide-react';
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

    const priciest = [...sold].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0)).slice(0, 3);
    const valuePicks = [...sold].sort((a, b) => (a.soldPrice || 0) - a.basePrice - ((b.soldPrice || 0) - b.basePrice)).slice(0, 3);

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
    <div className="bg-slate-900/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 shadow-2xl">
      <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
        <BarChart3 className="text-amber-400" size={22} /> Auction Intelligence &amp; Analytics
      </h2>

      {/* OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Total Spend" value={`${stats.totalSpend} L`} icon={<DollarSign size={18} className="text-emerald-400" />} />
        <Stat label="Players Sold" value={String(stats.sold.length)} icon={<Award size={18} className="text-amber-400" />} />
        <Stat label="Unsold" value={String(stats.unsold.length)} icon={<Flame size={18} className="text-rose-400" />} />
        <Stat label="Remaining in Pool" value={String(stats.available.length)} icon={<PieChart size={18} className="text-teal-400" />} />
      </div>

      {/* HIGHEST BUYS & VALUE PICKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-950/60 border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
            <TrendingUp size={14} /> Highest Value Acquisitions
          </h3>
          {stats.priciest.length === 0 && <div className="text-slate-500 text-xs italic">No sales recorded yet.</div>}
          <ul className="space-y-2">
            {stats.priciest.map((p) => (
              <li key={p.id} className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200">{p.name}</span>
                <span className="font-mono font-bold text-emerald-400">{p.soldPrice} L</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-950/60 border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
            <Award size={14} /> Best Value Steals (Closest to Base)
          </h3>
          {stats.valuePicks.length === 0 && <div className="text-slate-500 text-xs italic">No sales recorded yet.</div>}
          <ul className="space-y-2">
            {stats.valuePicks.map((p) => (
              <li key={p.id} className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200">{p.name}</span>
                <span className="font-mono font-bold text-emerald-400">
                  {p.soldPrice} L <span className="text-[10px] text-slate-400">(base {p.basePrice} L)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* SPEND BY ROLE */}
      <div className="mb-8">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Spend Distribution by Role</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...stats.roleSpend.entries()].map(([role, v]) => (
            <div key={role} className="bg-slate-950/60 border border-[rgba(255,255,255,0.05)] rounded-2xl p-3.5 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold">{role}</div>
              <div className="text-lg font-black font-mono text-emerald-400">{v.spend} L</div>
              <div className="text-[10px] text-slate-500 font-semibold">{v.count} players</div>
            </div>
          ))}
          {stats.roleSpend.size === 0 && <div className="text-slate-500 text-xs italic col-span-full">No sales recorded yet.</div>}
        </div>
      </div>

      {/* TEAM PURSE UTILIZATION BARS */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Team Purse Utilization</h3>
        <div className="space-y-3">
          {teams.map((t) => {
            const used = t.originalPurse - t.purse;
            const pct = t.originalPurse > 0 ? Math.min(100, Math.round((used / t.originalPurse) * 100)) : 0;
            return (
              <div key={t.id} className="bg-slate-950/60 border border-[rgba(255,255,255,0.05)] rounded-xl p-3">
                <div className="flex justify-between text-xs text-slate-300 font-bold mb-1.5">
                  <span>{t.name}</span>
                  <span className="font-mono text-emerald-400">
                    {used} / {t.originalPurse} L ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-slate-950/60 border border-[rgba(255,255,255,0.05)] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
    <div className="mb-1">{icon}</div>
    <div className="text-2xl font-black font-mono text-white mb-0.5">{value}</div>
    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</div>
  </div>
);
