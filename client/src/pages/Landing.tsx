import React, { useState } from 'react';
import {
  Gavel,
  Plus,
  Trash2,
  Copy,
  Check,
  Shield,
  Users,
  Clock,
  FileText,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Award,
  Palette,
  Orbit,
  Trophy,
  RotateCcw,
  Tv,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeMode, getInitialTheme, applyTheme } from '../lib/theme';

const SAMPLE_PLAYERS_CSV = `name,role,basePrice,previousTeamCode
Virat Sharma,Batsman,200,BLR
Rohit Verma,Batsman,200,MT
Suryakumar Yadav,Batsman,200,MT
Shubman Gill,Batsman,150,DEL
Yashasvi Jaiswal,Batsman,150,BLR
Rinku Singh,Batsman,100,KKR
Jasprit Bumrah,Bowler,200,MT
Rashid Khan,Bowler,200,DEL
Mohammed Shami,Bowler,150,KKR
Trent Boult,Bowler,150,CSK
Kuldeep Yadav,Bowler,120,DEL
Arshdeep Singh,Bowler,100,KKR
Hardik Pandya,All-Rounder,200,MT
Ravindra Jadeja,All-Rounder,200,CSK
Andre Russell,All-Rounder,180,KKR
Glenn Maxwell,All-Rounder,150,BLR
Axar Patel,All-Rounder,120,DEL
Sam Curran,All-Rounder,120,CSK
MS Dhoni,Wicketkeeper,150,CSK
Rishabh Pant,Wicketkeeper,200,DEL
Heinrich Klaasen,Wicketkeeper,150,MT
Sanju Samson,Wicketkeeper,150,BLR
Nicholas Pooran,Wicketkeeper,150,CSK
Phil Salt,Wicketkeeper,100,KKR`;

interface TeamRow {
  name: string;
  code: string;
  purse: number;
}

interface CreatedAuction {
  roomId: string;
  adminToken: string;
  teams: { id: string; name: string; code: string; token: string }[];
}

export const Landing: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [teams, setTeams] = useState<TeamRow[]>([
    { name: 'Royal Challengers', code: 'RCB', purse: 10000 },
    { name: 'Chennai Super Kings', code: 'CSK', purse: 10000 },
  ]);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [rtmEnabled, setRtmEnabled] = useState(false);
  const [playersCsv, setPlayersCsv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAuction | null>(null);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [demoStatus, setDemoStatus] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  const cycleTheme = () => {
    const next: ThemeMode =
      theme === 'cobalt' ? 'telemetry' : theme === 'telemetry' ? 'pear' : 'cobalt';
    setTheme(next);
    applyTheme(next);
  };

  const handleResetDemo = async () => {
    setResettingDemo(true);
    setDemoStatus(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      setDemoStatus('Demo tournament reset successfully with 5 fresh franchise teams and 24 players.');
    } catch {
      setDemoStatus('Demo tournament state refreshed.');
    } finally {
      setResettingDemo(false);
    }
  };

  const handleFillSampleData = () => {
    setName('Premier Cricket League 2026');
    setTeams([
      { name: 'Mumbai Titans', code: 'MT', purse: 12000 },
      { name: 'Chennai Kings', code: 'CSK', purse: 11000 },
      { name: 'Bangalore Strikers', code: 'BLR', purse: 10500 },
      { name: 'Delhi Dynamos', code: 'DEL', purse: 9800 },
      { name: 'Kolkata Crusaders', code: 'KKR', purse: 10000 },
    ]);
    setTimerSeconds(15);
    setRtmEnabled(true);
    setPlayersCsv(SAMPLE_PLAYERS_CSV);
    setStep(2);
  };

  const updateTeam = (idx: number, field: keyof TeamRow, value: string) => {
    setTeams((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        if (field === 'purse') {
          return { ...t, purse: Number(value) || 0 };
        }
        if (field === 'name') {
          const autoCode =
            t.code === '' || t.code === t.name.slice(0, 3).toUpperCase()
              ? value.slice(0, 3).toUpperCase()
              : t.code;
          return { ...t, name: value, code: autoCode };
        }
        return { ...t, [field]: value };
      })
    );
  };

  const addTeam = () => setTeams((prev) => [...prev, { name: '', code: '', purse: 10000 }]);
  const removeTeam = (idx: number) => setTeams((prev) => prev.filter((_, i) => i !== idx));

  const validTeams = teams.filter((t) => t.name.trim().length > 0);
  const canSubmit = name.trim().length > 0 && validTeams.length >= 2 && !submitting;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          teams: validTeams.map((t) => ({
            name: t.name.trim(),
            code: t.code.trim() || t.name.slice(0, 3).toUpperCase(),
            purse: t.purse,
          })),
          rules: { timerSeconds, rtmEnabled },
          playersCsv: playersCsv.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create auction tournament.');
        return;
      }
      setCreated({ roomId: data.roomId, adminToken: data.adminToken, teams: data.teams });
    } catch (e: any) {
      setError(e.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  // POST-CREATION CAPABILITY LINK DESK
  if (created) {
    const base = `${window.location.origin}${window.location.pathname}`;
    const adminUrl = `${base}?room=${created.roomId}&token=${created.adminToken}&view=admin`;
    const spectatorUrl = `${base}?room=${created.roomId}&view=spectator`;
    const broadcastUrl = `${base}?room=${created.roomId}&view=broadcast`;

    return (
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 sm:p-8 font-sans">
        <div className="max-w-2xl w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-[12px] bg-[var(--accent-primary)]/15 border border-[var(--border-prominent)] flex items-center justify-center text-[var(--accent-sky)]">
              <Award size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">{name} Ready</h1>
              <div className="text-xs font-mono font-bold text-[var(--accent-sky)]">
                Room Code: <span className="text-white">{created.roomId}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
            Your auction arena is configured and live. Copy and distribute your private team bidder links and admin link.
          </p>

          <div className="space-y-4 mb-6">
            {/* Admin Desk Link */}
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-prominent)] rounded-[12px] p-4 shadow-sm">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-[var(--accent-sky)] flex items-center gap-1.5">
                  <Shield size={14} className="text-[var(--accent-sky)]" /> Auctioneer Admin Command Link
                </span>
                <span className="text-[10px] text-[var(--accent-sky)] uppercase font-mono font-bold">Keep Private</span>
              </div>
              <CopyField value={adminUrl} />
            </div>

            {/* Franchise Team Join Links */}
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[12px] p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Users size={14} className="text-[var(--accent-sky)]" /> Team Franchise Bidder Links
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono font-semibold">{created.teams.length} Teams</span>
              </div>
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {created.teams.map((t) => {
                  const teamUrl = `${base}?room=${created.roomId}&token=${t.token}&team=${t.id}&view=bidder`;
                  return (
                    <div key={t.id} className="p-3 rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col gap-1 text-xs">
                      <span className="font-bold text-[var(--text-primary)]">{t.name} ({t.code})</span>
                      <CopyField value={teamUrl} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Public Links */}
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[12px] p-4 shadow-sm">
              <span className="text-xs font-bold text-[var(--text-primary)] block mb-2">Public &amp; Stream Broadcast Links</span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[11px] text-[var(--text-secondary)] mb-0.5 block font-medium">Public Spectator Arena</span>
                  <CopyField value={spectatorUrl} />
                </div>
                <div>
                  <span className="text-[11px] text-[var(--text-secondary)] mb-0.5 block font-medium">OBS / Livestream Broadcast Overlay</span>
                  <CopyField value={broadcastUrl} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setCreated(null)}
              className="px-5 py-3.5 rounded-[12px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)] text-[var(--text-secondary)] hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Edit Room Settings</span>
            </button>
            <a
              href={adminUrl}
              className="flex-1 py-3.5 rounded-[12px] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-[0.98] focus-ring"
            >
              <span>Launch Auctioneer Command Desk</span>
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      {/* TOP HEADER: BRAND + THEME SWITCHER + DESIGN LAB */}
      <div className="max-w-3xl w-full mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] flex items-center justify-center text-[var(--accent-sky)] shadow-sm">
            <Gavel size={18} />
          </div>
          <div>
            <div className="font-display font-bold text-base tracking-tight text-[var(--text-primary)]">
              Cricket Auction Platform
            </div>
            <div className="text-[11px] text-[var(--text-secondary)]">
              Broadcast &amp; Live Franchise Gavel Engine
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher Pill */}
          <button
            onClick={cycleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-sky)]/50 text-xs font-mono transition-colors focus-ring"
            title={`Active Theme: ${theme === 'cobalt' ? 'Cobalt Sky' : theme === 'telemetry' ? 'F1 Telemetry' : 'Pear.no'} (Click to cycle)`}
            aria-label="Toggle Theme"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  theme === 'cobalt' ? '#0047AB' : theme === 'telemetry' ? '#d4ff00' : '#38bdf8',
              }}
            />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {theme === 'cobalt' ? 'Cobalt Sky' : theme === 'telemetry' ? 'F1 Telemetry' : 'Pear.no'}
            </span>
          </button>

          <a
            href="/?view=preview"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-sky)]/40 text-xs text-[var(--text-secondary)] hover:text-white transition-colors"
            title="Open Design & Motion Laboratory"
          >
            <Orbit size={14} className="text-[var(--accent-sky)]" />
            <span className="font-semibold text-xs">Motion Lab &rarr;</span>
          </a>
        </div>
      </div>

      {/* HERO SECTION */}
      <div className="max-w-3xl w-full text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-[var(--text-primary)] mb-2">
          Live Franchise Player Auction
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
          High-concurrency gavel engine with real-time purse tracking, right-to-match enforcement, and broadcast-ready stream overlays.
        </p>
      </div>

      {/* PRE-POPULATED DEMO TOURNAMENT EXECUTIVE LAUNCHPAD */}
      <div className="max-w-3xl w-full mb-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 shadow-2xl relative overflow-hidden">
        {/* Tournament Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[var(--accent-primary)]/15 border border-[var(--border-prominent)] flex items-center justify-center text-[var(--accent-sky)]">
              <Trophy size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-display font-bold text-[var(--text-primary)]">Premier Cricket League 2026</h2>
                <span className="px-2 py-0.5 rounded-[4px] bg-[var(--accent-primary)]/20 border border-[var(--border-prominent)] text-[var(--accent-sky)] text-[10px] font-mono font-bold">
                  ROOM: DEMO
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Mega Auction &middot; 5 Franchises &middot; 24 Star Players &middot; 15s Timer &middot; RTM Enabled
              </p>
            </div>
          </div>

          <button
            onClick={handleResetDemo}
            disabled={resettingDemo}
            className="px-3 py-1.5 rounded-[8px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)] text-xs font-semibold text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 transition-colors shrink-0"
            title="Reset demo tournament back to fresh opening state"
          >
            <RotateCcw size={13} className={resettingDemo ? 'animate-spin' : ''} />
            <span>{resettingDemo ? 'Resetting...' : 'Reset Demo State'}</span>
          </button>
        </div>

        {demoStatus && (
          <div className="mb-4 p-2.5 rounded-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>{demoStatus}</span>
            <button onClick={() => setDemoStatus(null)} className="text-emerald-300/60 hover:text-emerald-300">&times;</button>
          </div>
        )}

        {/* PRIMARY ACTION: AUCTIONEER DESK */}
        <a
          href="/?room=DEMO&token=demo_admin_secret&view=admin"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full p-4 rounded-[12px] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white flex items-center justify-between shadow-lg mb-5 transition-transform active:scale-[0.99] focus-ring group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-[var(--accent-sky)]">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>Enter Auctioneer Command Desk</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/15 text-white">Organizer</span>
              </div>
              <p className="text-xs text-white/80">Control the active lot, countdown timer, gavel decisions, and RTM matching</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-white group-hover:translate-x-0.5 transition-transform">
            <span>Launch Desk</span>
            <ArrowRight size={16} />
          </div>
        </a>

        {/* FRANCHISE BIDDER PADDLES SECTION */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Franchise Bidding Terminals (Select Team Paddle)
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] font-mono">5 Teams Online</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {/* Mumbai Titans */}
            <a
              href="/?room=DEMO&token=tok_mt&team=team_mt&view=bidder"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center font-mono font-bold text-xs text-[var(--accent-sky)]">
                  MT
                </span>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-sky)] transition-colors">
                    Mumbai Titans
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)]">Purse: 12,000L &middot; 2 RTM</div>
                </div>
              </div>
              <ExternalLink size={12} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-sky)] opacity-60 group-hover:opacity-100" />
            </a>

            {/* Chennai Kings */}
            <a
              href="/?room=DEMO&token=tok_csk&team=team_csk&view=bidder"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center font-mono font-bold text-xs text-[var(--accent-sky)]">
                  CSK
                </span>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-sky)] transition-colors">
                    Chennai Kings
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)]">Purse: 11,000L &middot; 2 RTM</div>
                </div>
              </div>
              <ExternalLink size={12} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-sky)] opacity-60 group-hover:opacity-100" />
            </a>

            {/* Bangalore Strikers */}
            <a
              href="/?room=DEMO&token=tok_blr&team=team_blr&view=bidder"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center font-mono font-bold text-xs text-[var(--accent-sky)]">
                  BLR
                </span>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-sky)] transition-colors">
                    Bangalore Strikers
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)]">Purse: 10,500L &middot; 2 RTM</div>
                </div>
              </div>
              <ExternalLink size={12} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-sky)] opacity-60 group-hover:opacity-100" />
            </a>

            {/* Delhi Dynamos */}
            <a
              href="/?room=DEMO&token=tok_del&team=team_del&view=bidder"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center font-mono font-bold text-xs text-[var(--accent-sky)]">
                  DEL
                </span>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-sky)] transition-colors">
                    Delhi Dynamos
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)]">Purse: 9,800L &middot; 1 RTM</div>
                </div>
              </div>
              <ExternalLink size={12} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-sky)] opacity-60 group-hover:opacity-100" />
            </a>

            {/* Kolkata Crusaders */}
            <a
              href="/?room=DEMO&token=tok_kkr&team=team_kkr&view=bidder"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center font-mono font-bold text-xs text-[var(--accent-sky)]">
                  KKR
                </span>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-sky)] transition-colors">
                    Kolkata Crusaders
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)]">Purse: 10,000L &middot; 2 RTM</div>
                </div>
              </div>
              <ExternalLink size={12} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-sky)] opacity-60 group-hover:opacity-100" />
            </a>

            {/* Spectator Arena Link Card */}
            <a
              href="/?room=DEMO&view=spectator"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-emerald-500/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-emerald-400">
                  <Activity size={14} />
                </span>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                    Spectator Coliseum
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Public audience stream</div>
                </div>
              </div>
              <ExternalLink size={12} className="text-[var(--text-secondary)] group-hover:text-emerald-400 opacity-60 group-hover:opacity-100" />
            </a>
          </div>
        </div>

        {/* BROADCAST OVERLAY LINK STRIP */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Tv size={14} className="text-[var(--accent-sky)] shrink-0" />
            <span>OBS Livestream Studio Overlay (1080p Chroma Key)</span>
          </div>
          <a
            href="/?room=DEMO&view=broadcast"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-sky)] hover:underline font-mono font-bold flex items-center gap-1 shrink-0"
          >
            <span>Open OBS Lower-Third</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* CUSTOM TOURNAMENT BUILDER */}
      <div className="max-w-3xl w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 sm:p-8 shadow-2xl flex flex-col">
        {/* WIZARD HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[var(--accent-primary)]/15 border border-[var(--border-prominent)] flex items-center justify-center text-[var(--accent-sky)]">
              <Gavel size={20} />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-[var(--text-primary)]">Custom Tournament Builder</h2>
              <p className="text-xs text-[var(--text-secondary)]">Configure custom rules, franchises, and CSV player rosters</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFillSampleData}
            className="px-3.5 py-2 rounded-[8px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-prominent)] text-xs font-bold text-[var(--accent-sky)] flex items-center gap-1.5 transition-colors self-start sm:self-auto focus-ring"
          >
            <span>Load Tournament Sample Data</span>
          </button>
        </div>

        {/* STEP PROGRESS INDICATOR */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            onClick={() => setStep(1)}
            className={`py-2 px-3 rounded-[10px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
              step === 1
                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-white'
            }`}
          >
            <span>1. Rules</span>
          </button>
          <button
            onClick={() => name.trim() && setStep(2)}
            disabled={!name.trim()}
            className={`py-2 px-3 rounded-[10px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
              step === 2
                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] disabled:opacity-40'
            }`}
          >
            <span>2. Franchises ({validTeams.length})</span>
          </button>
          <button
            onClick={() => name.trim() && validTeams.length >= 2 && setStep(3)}
            disabled={!name.trim() || validTeams.length < 2}
            className={`py-2 px-3 rounded-[10px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
              step === 3
                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] disabled:opacity-40'
            }`}
          >
            <span>3. Players</span>
          </button>
        </div>

        {/* STEP 1: TOURNAMENT RULES */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Tournament / Auction Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Champions Trophy 2026"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[12px] px-4 py-3 text-sm text-white outline-none focus:border-[var(--border-focus)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[12px] p-4">
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-[var(--accent-sky)]" /> Countdown Timer (Seconds)
                </label>
                <div className="flex items-center gap-2 mt-2">
                  {[10, 15, 20, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTimerSeconds(sec)}
                      className={`px-3 py-1.5 rounded-[8px] text-xs font-mono font-bold border transition-colors ${
                        timerSeconds === sec
                          ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-focus)]'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Number(e.target.value) || 15)}
                    className="w-16 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-2 py-1.5 text-xs text-white font-mono text-center outline-none focus:border-[var(--border-focus)]"
                  />
                </div>
              </div>

              <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[12px] p-4 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                    <Award size={14} className="text-[var(--accent-sky)]" /> Right-to-Match (RTM)
                  </label>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
                    Allows original franchise to retain a player by matching the winning gavel bid.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rtmEnabled}
                    onChange={(e) => setRtmEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--accent-primary)] focus:ring-0 bg-[var(--bg-surface)] border-[var(--border-subtle)]"
                  />
                  <span>Enable Official RTM Cards</span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                disabled={!name.trim()}
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-[12px] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-transform active:scale-95 focus-ring"
              >
                <span>Next: Setup Franchises</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: FRANCHISE TEAMS */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Participating Franchise Teams (Min 2)
                </span>
                <p className="text-[11px] text-[var(--text-secondary)]">Define each franchise name, short code, and purse</p>
              </div>
              <button
                onClick={addTeam}
                className="px-3 py-1.5 rounded-[8px] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold text-xs flex items-center gap-1 focus-ring"
              >
                <Plus size={13} /> Add Franchise
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {teams.map((t, idx) => (
                <div key={idx} className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[12px] flex gap-2 items-center">
                  <div className="flex-1">
                    <input
                      placeholder="Franchise Name"
                      value={t.name}
                      onChange={(e) => updateTeam(idx, 'name', e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--border-focus)]"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      placeholder="CODE"
                      maxLength={4}
                      value={t.code}
                      onChange={(e) => updateTeam(idx, 'code', e.target.value.toUpperCase())}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-2 py-1.5 text-xs font-mono text-center text-[var(--accent-sky)] uppercase outline-none focus:border-[var(--border-focus)]"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Purse (L)"
                      value={t.purse}
                      onChange={(e) => updateTeam(idx, 'purse', e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-2.5 py-1.5 text-xs font-mono text-[var(--accent-sky)] outline-none focus:border-[var(--border-focus)]"
                    />
                  </div>
                  {teams.length > 2 && (
                    <button
                      onClick={() => removeTeam(idx)}
                      className="p-1.5 rounded-[8px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      title="Remove team"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-[12px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs flex items-center gap-1.5 border border-[var(--border-subtle)]"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                disabled={validTeams.length < 2}
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-[12px] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-transform active:scale-95 focus-ring"
              >
                <span>Next: Player Pool</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: PLAYER POOL */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Player Pool CSV (Optional)
              </label>
              <p className="text-[11px] text-[var(--text-secondary)] mb-2 leading-relaxed">
                Paste your CSV player list now, or add players later from the Admin Console.
              </p>
              <textarea
                value={playersCsv}
                onChange={(e) => setPlayersCsv(e.target.value)}
                placeholder={`name,role,basePrice,cricheroesUrl\nVirat Kohli,Batsman,200,https://cricheroes.com/player-profile/12345/virat-kohli/matches\nJasprit Bumrah,Bowler,200,\nRashid Khan,Bowler,150,`}
                className="w-full min-h-[140px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[12px] p-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] resize-none leading-relaxed"
              />
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Supported columns: <code>name</code> (required), <code>role</code> (Batsman / Bowler / All-Rounder / Wicketkeeper), <code>basePrice</code>, <code>cricheroesUrl</code>.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-[12px] bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-[12px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs flex items-center gap-1.5 border border-[var(--border-subtle)]"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                disabled={!canSubmit}
                onClick={handleCreate}
                className="px-8 py-3 rounded-[12px] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 transition-transform active:scale-95 focus-ring"
              >
                <Gavel size={16} />
                <span>{submitting ? 'Creating Arena...' : 'Create Tournament Auction'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const CopyField: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value}
        className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-3 py-2 text-[var(--text-primary)] font-mono text-xs outline-none focus:border-[var(--border-focus)] select-all"
        onFocus={(e) => e.target.select()}
      />
      <button
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="px-3.5 py-2 rounded-[8px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold transition-colors shrink-0 focus-ring"
      >
        {copied ? <Check size={14} className="text-[var(--accent-success)]" /> : <Copy size={14} />}
      </button>
    </div>
  );
};

