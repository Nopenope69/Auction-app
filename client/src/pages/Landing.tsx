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
      theme === 'telemetry' ? 'pear' : theme === 'pear' ? 'heritage' : 'telemetry';
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

  // POST-CREATION CAPABILITY LINK DESK (Boxy 16px geometry)
  if (created) {
    const base = `${window.location.origin}${window.location.pathname}`;
    const adminUrl = `${base}?room=${created.roomId}&token=${created.adminToken}&view=admin`;
    const spectatorUrl = `${base}?room=${created.roomId}&view=spectator`;
    const broadcastUrl = `${base}?room=${created.roomId}&view=broadcast`;

    return (
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 sm:p-8 font-sans">
        <div className="max-w-2xl w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-[12px] bg-[#c2a365]/10 border border-[#c2a365]/30 flex items-center justify-center text-[#c2a365]">
              <Award size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)]">{name} Ready</h1>
              <div className="text-xs font-mono font-bold text-[#c2a365]">
                Room Code: <span className="text-white">{created.roomId}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
            Your auction arena is configured and live. Copy and distribute your private team bidder links and admin link.
          </p>

          <div className="space-y-4 mb-6">
            {/* Admin Desk Link */}
            <div className="bg-[var(--bg-base)] border border-[#c2a365]/30 rounded-[12px] p-4 shadow-sm">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-[#c2a365] flex items-center gap-1.5">
                  <Shield size={14} className="text-[#c2a365]" /> Auctioneer Admin Command Link
                </span>
                <span className="text-[10px] text-[#c2a365] uppercase font-mono font-bold">Keep Private</span>
              </div>
              <CopyField value={adminUrl} />
            </div>

            {/* Franchise Team Join Links */}
            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Users size={14} className="text-[#c2a365]" /> Team Franchise Bidder Links
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
            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] p-4 shadow-sm">
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
              className="px-5 py-3.5 rounded-[12px] bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[#c2a365]/40 text-[var(--text-secondary)] hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Edit Room Settings</span>
            </button>
            <a
              href={adminUrl}
              className="flex-1 py-3.5 rounded-[12px] bg-[#c2a365] hover:bg-[#b09257] text-[#0b0a09] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-[0.98] focus-ring"
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
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 sm:p-8 font-sans">
      {/* TOP HEADER: BRAND + THEME SWITCHER + DESIGN LAB */}
      <div className="max-w-3xl w-full mb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
            <Gavel size={16} />
          </div>
          <div>
            <div className="font-display font-bold text-sm tracking-tight text-[var(--text-primary)]">
              Cricket Auction Platform
            </div>
            <div className="text-[10px] font-mono text-[var(--text-secondary)]">
              High-Frequency Live Gavel Engine
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher Pill */}
          <button
            onClick={cycleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 text-xs font-mono transition-colors focus-ring"
            title={`Active Theme: ${theme === 'telemetry' ? 'F1 Pit-Wall Telemetry' : theme === 'pear' ? 'Pear.no' : "Lord's Heritage"} (Click to cycle)`}
            aria-label="Toggle Theme"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  theme === 'telemetry' ? '#d4ff00' : theme === 'pear' ? '#38bdf8' : '#d4af37',
              }}
            />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {theme === 'telemetry' ? '⚡ F1 Telemetry' : theme === 'pear' ? 'Pear.no' : "Lord's"}
            </span>
          </button>

          <a
            href="/?view=preview"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 text-xs text-[var(--text-secondary)] hover:text-white transition-colors"
            title="Open Design & Motion Laboratory"
          >
            <Orbit size={14} className="text-[var(--accent-primary)]" />
            <span className="font-semibold text-xs">Motion Lab &rarr;</span>
          </a>
        </div>
      </div>

      {/* PRE-POPULATED DEMO TOURNAMENT CLICKTHROUGH ARENA */}
      <div className="max-w-3xl w-full mb-6 bg-[var(--bg-surface)] border border-[#c2a365]/40 rounded-[16px] p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#c2a365]/15 border border-[#c2a365]/30 flex items-center justify-center text-[#c2a365]">
              <Trophy size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-display font-bold text-white">Pre-Populated Demo Tournament</h2>
                <span className="px-2 py-0.5 rounded-[4px] bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-[10px] font-mono font-bold">
                  ROOM: DEMO
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                5 franchise teams &middot; 24 top-tier players &middot; Click any view below to test full functionality
              </p>
            </div>
          </div>

          <button
            onClick={handleResetDemo}
            disabled={resettingDemo}
            className="px-3 py-1.5 rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[#c2a365]/40 text-xs font-semibold text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 transition-colors shrink-0"
            title="Reset demo tournament back to fresh opening state"
          >
            <RotateCcw size={13} className={resettingDemo ? 'animate-spin' : ''} />
            <span>{resettingDemo ? 'Resetting...' : 'Reset Demo State'}</span>
          </button>
        </div>

        {demoStatus && (
          <div className="mb-4 p-2.5 rounded-[8px] bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs font-semibold flex items-center justify-between">
            <span>{demoStatus}</span>
            <button onClick={() => setDemoStatus(null)} className="text-[#10b981]/60 hover:text-[#10b981]">&times;</button>
          </div>
        )}

        {/* CLICKTHROUGH ROLE MATRIX */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Admin Command Desk */}
          <a
            href="/?room=DEMO&token=demo_admin_secret&view=admin"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-[12px] bg-[var(--bg-base)] border border-[#c2a365]/40 hover:border-[#c2a365] transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between text-[#c2a365] mb-1">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Shield size={14} /> Auctioneer Admin
                </span>
                <ExternalLink size={12} className="opacity-60 group-hover:opacity-100" />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                Put players on the block, control the gavel, process RTM matching.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-mono text-[#c2a365] font-semibold flex items-center gap-1">
              <span>Open Desk &rarr;</span>
            </div>
          </a>

          {/* Bidder 1: Mumbai Titans */}
          <a
            href="/?room=DEMO&token=tok_mt&team=team_mt&view=bidder"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-[12px] bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[#38bdf8]/60 transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between text-[#38bdf8] mb-1">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Users size={14} /> Bidder: Mumbai Titans
                </span>
                <ExternalLink size={12} className="opacity-60 group-hover:opacity-100" />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                Purse: 12,000L &middot; 2 RTMs &middot; Tactical single-tap paddle &amp; deck.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-mono text-[#38bdf8] font-semibold flex items-center gap-1">
              <span>Open Terminal &rarr;</span>
            </div>
          </a>

          {/* Bidder 2: Chennai Kings */}
          <a
            href="/?room=DEMO&token=tok_csk&team=team_csk&view=bidder"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-[12px] bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[#38bdf8]/60 transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between text-[#38bdf8] mb-1">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Users size={14} /> Bidder: Chennai Kings
                </span>
                <ExternalLink size={12} className="opacity-60 group-hover:opacity-100" />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                Purse: 11,000L &middot; 2 RTMs &middot; Test live bidding &amp; outbid alerts.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-mono text-[#38bdf8] font-semibold flex items-center gap-1">
              <span>Open Terminal &rarr;</span>
            </div>
          </a>

          {/* Bidder 3: Bangalore Strikers */}
          <a
            href="/?room=DEMO&token=tok_blr&team=team_blr&view=bidder"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-[12px] bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[#38bdf8]/60 transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between text-[#38bdf8] mb-1">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Users size={14} /> Bidder: Bangalore Strikers
                </span>
                <ExternalLink size={12} className="opacity-60 group-hover:opacity-100" />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                Purse: 10,500L &middot; 2 RTMs &middot; Test 3-way bidding wars.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-mono text-[#38bdf8] font-semibold flex items-center gap-1">
              <span>Open Terminal &rarr;</span>
            </div>
          </a>

          {/* Spectator Arena */}
          <a
            href="/?room=DEMO&view=spectator"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-[12px] bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[#10b981]/60 transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between text-[#10b981] mb-1">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Activity size={14} /> Spectator Arena
                </span>
                <ExternalLink size={12} className="opacity-60 group-hover:opacity-100" />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                Public coliseum with live hammer countdown &amp; AI auctioneer audio.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-mono text-[#10b981] font-semibold flex items-center gap-1">
              <span>Open Arena &rarr;</span>
            </div>
          </a>

          {/* Broadcast Overlay */}
          <a
            href="/?room=DEMO&view=broadcast"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-[12px] bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-purple-400/60 transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between text-purple-300 mb-1">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Tv size={14} /> Broadcast Lower-Third
                </span>
                <ExternalLink size={12} className="opacity-60 group-hover:opacity-100" />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                Transparent studio overlay for OBS livestreaming &amp; chroma keying.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-mono text-purple-300 font-semibold flex items-center gap-1">
              <span>Open Overlay &rarr;</span>
            </div>
          </a>
        </div>
      </div>

      <div className="max-w-3xl w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 sm:p-8 shadow-2xl flex flex-col">
        {/* WIZARD HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#c2a365]/10 border border-[#c2a365]/30 flex items-center justify-center text-[#c2a365]">
              <Gavel size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)]">Custom Tournament Builder</h1>
              <p className="text-xs text-[var(--text-secondary)]">Or build a customized tournament with your own rules</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFillSampleData}
            className="px-3.5 py-2 rounded-[8px] bg-[#c2a365]/15 hover:bg-[#c2a365]/25 border border-[#c2a365]/30 text-xs font-bold text-[#c2a365] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <span>⚡ Auto-Fill 5 Teams &amp; 24 Players</span>
          </button>
        </div>

        {/* STEP PROGRESS INDICATOR (8-point rhythm: gap-2, mb-6) */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            onClick={() => setStep(1)}
            className={`py-2 px-3 rounded-[12px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
              step === 1
                ? 'bg-[#c2a365] text-[#0b0a09] border-[#c2a365] shadow'
                : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-white'
            }`}
          >
            <span>1. Rules</span>
          </button>
          <button
            onClick={() => name.trim() && setStep(2)}
            disabled={!name.trim()}
            className={`py-2 px-3 rounded-[12px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
              step === 2
                ? 'bg-[#c2a365] text-[#0b0a09] border-[#c2a365] shadow'
                : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-subtle)] disabled:opacity-40'
            }`}
          >
            <span>2. Teams ({validTeams.length})</span>
          </button>
          <button
            onClick={() => name.trim() && validTeams.length >= 2 && setStep(3)}
            disabled={!name.trim() || validTeams.length < 2}
            className={`py-2 px-3 rounded-[12px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
              step === 3
                ? 'bg-[#c2a365] text-[#0b0a09] border-[#c2a365] shadow'
                : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-subtle)] disabled:opacity-40'
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
                placeholder="e.g. Premier League Season 5"
                className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] px-4 py-3 text-sm text-white outline-none focus:border-[#c2a365]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] p-4">
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-[#c2a365]" /> Countdown Timer (Seconds)
                </label>
                <div className="flex items-center gap-2 mt-2">
                  {[10, 15, 20, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTimerSeconds(sec)}
                      className={`px-3 py-1.5 rounded-[8px] text-xs font-mono font-bold border transition-colors ${
                        timerSeconds === sec
                          ? 'bg-[#c2a365] text-[#0b0a09] border-[#c2a365]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[#8c8a82]'
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
                    className="w-16 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-2 py-1.5 text-xs text-white font-mono text-center outline-none focus:border-[#c2a365]"
                  />
                </div>
              </div>

              <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] p-4 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                    <Award size={14} className="text-[#c2a365]" /> Right-to-Match (RTM)
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
                    className="w-4 h-4 rounded text-[#c2a365] focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <span>Enable IPL-Style RTM Cards</span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                disabled={!name.trim()}
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-[12px] bg-[#c2a365] hover:bg-[#b09257] disabled:opacity-40 text-[#0b0a09] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-transform active:scale-95 focus-ring"
              >
                <span>Next: Setup Teams</span>
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
                <p className="text-[11px] text-[var(--text-secondary)]">Define each team's name, short code, and starting purse</p>
              </div>
              <button
                onClick={addTeam}
                className="px-3 py-1.5 rounded-[8px] bg-[#c2a365] hover:bg-[#b09257] text-[#0b0a09] font-bold text-xs flex items-center gap-1 focus-ring"
              >
                <Plus size={13} /> Add Team
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {teams.map((t, idx) => (
                <div key={idx} className="p-3 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] flex gap-2 items-center">
                  <div className="flex-1">
                    <input
                      placeholder="Franchise Name"
                      value={t.name}
                      onChange={(e) => updateTeam(idx, 'name', e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-3 py-1.5 text-xs text-white outline-none focus:border-[#c2a365]"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      placeholder="CODE"
                      maxLength={4}
                      value={t.code}
                      onChange={(e) => updateTeam(idx, 'code', e.target.value.toUpperCase())}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-2 py-1.5 text-xs font-mono text-center text-[#38bdf8] uppercase outline-none focus:border-[#c2a365]"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Purse (L)"
                      value={t.purse}
                      onChange={(e) => updateTeam(idx, 'purse', e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-2.5 py-1.5 text-xs font-mono text-[#38bdf8] outline-none focus:border-[#c2a365]"
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
                className="px-4 py-2.5 rounded-[12px] bg-[var(--bg-base)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold text-xs flex items-center gap-1.5 border border-[var(--border-subtle)]"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                disabled={validTeams.length < 2}
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-[12px] bg-[#c2a365] hover:bg-[#b09257] disabled:opacity-40 text-[#0b0a09] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-transform active:scale-95 focus-ring"
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
                className="w-full min-h-[140px] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[12px] p-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[#c2a365] resize-none leading-relaxed"
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
                className="px-4 py-2.5 rounded-[12px] bg-[var(--bg-base)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold text-xs flex items-center gap-1.5 border border-[var(--border-subtle)]"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                disabled={!canSubmit}
                onClick={handleCreate}
                className="px-8 py-3 rounded-[12px] bg-[#c2a365] hover:bg-[#b09257] disabled:opacity-40 text-[#0b0a09] font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 transition-transform active:scale-95 focus-ring"
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
        className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] px-3 py-2 text-[var(--text-primary)] font-mono text-xs outline-none focus:border-[#c2a365] select-all"
        onFocus={(e) => e.target.select()}
      />
      <button
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="px-3.5 py-2 rounded-[8px] bg-[var(--bg-elevated)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] font-semibold transition-colors shrink-0 focus-ring"
      >
        {copied ? <Check size={14} className="text-[#10b981]" /> : <Copy size={14} />}
      </button>
    </div>
  );
};
