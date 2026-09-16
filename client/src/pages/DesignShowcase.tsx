import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Clock,
  Shield,
  Award,
  Users,
  TrendingUp,
  CheckCircle2,
  Flame,
  ArrowRight,
  RotateCcw,
  Play,
  Pause,
  Sparkles,
  Activity,
  Layers,
  Zap,
  Eye,
  Orbit,
  Sliders,
} from 'lucide-react';
import { ThemeMode, getInitialTheme, applyTheme } from '../lib/theme';
import { RotatingCarousel, CarouselItem } from '../components/animations/RotatingCarousel';
import { SoldParticleExplosion } from '../components/animations/SoldParticleExplosion';
import { CameraShakeImpact } from '../components/animations/CameraShakeImpact';
import { SpotlightReveal } from '../components/animations/SpotlightReveal';
import { UrgencyCountdownTimer } from '../components/animations/UrgencyCountdownTimer';

export const DesignShowcase: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [activeBid, setActiveBid] = useState(240);
  const [leadingTeam, setLeadingTeam] = useState('Mumbai Titans');
  const [leadingCode, setLeadingCode] = useState('MT');
  const [timerSeconds, setTimerSeconds] = useState(8);
  const [timerRunning, setTimerRunning] = useState(false);
  const [status, setStatus] = useState<'bidding' | 'sold' | 'unsold'>('bidding');

  // Interactive Animation Trigger States
  const [showSoldExplosion, setShowSoldExplosion] = useState(false);
  const [showImpactShake, setShowImpactShake] = useState(false);
  const [showSpotlightReveal, setShowSpotlightReveal] = useState(false);
  const [activeTab, setActiveTab] = useState<'gavel' | 'animations'>('animations');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Timer countdown simulation
  useEffect(() => {
    if (!timerRunning || status !== 'bidding') return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, status]);

  const handleBid = (increment: number) => {
    if (status !== 'bidding') return;
    const next = activeBid + increment;
    setActiveBid(next);
    setTimerSeconds(15);
    setTimerRunning(true);
    setLeadingTeam(leadingTeam === 'Mumbai Titans' ? 'Bangalore Royals' : 'Mumbai Titans');
    setLeadingCode(leadingCode === 'MT' ? 'BR' : 'MT');
  };

  const handleSold = () => {
    setStatus('sold');
    setTimerRunning(false);
    setShowSoldExplosion(true); // Triggers the Particle Explosion!
  };

  const handleUnsold = () => {
    setStatus('unsold');
    setTimerRunning(false);
  };

  const handleReset = () => {
    setStatus('bidding');
    setActiveBid(200);
    setTimerSeconds(15);
    setTimerRunning(false);
    setLeadingTeam('Mumbai Titans');
    setLeadingCode('MT');
    setShowSoldExplosion(false);
  };

  // Demo Carousel Items
  const demoCarouselItems: CarouselItem[] = [
    {
      id: 'p1',
      title: 'Jasprit Bumrah',
      subtitle: 'Fast Bowler · India',
      badge: 'PACE SPEARHEAD',
      price: 240,
    },
    {
      id: 'p2',
      title: 'Heinrich Klaasen',
      subtitle: 'Wicketkeeper / Finisher',
      badge: 'POWER HITTER',
      price: 180,
    },
    {
      id: 'p3',
      title: 'Rashid Khan',
      subtitle: 'Leg Spinner / All-Rounder',
      badge: 'SPIN WIZARD',
      price: 220,
    },
    {
      id: 'p4',
      title: 'Travis Head',
      subtitle: 'Opening Batsman · Australia',
      badge: 'IMPACT BAT',
      price: 160,
    },
    {
      id: 'p5',
      title: 'Andre Russell',
      subtitle: 'All-Rounder · West Indies',
      badge: 'DEATH OVER MATCH-WINNER',
      price: 200,
    },
  ];

  const demoTeams = [
    { id: 't1', name: 'Mumbai Titans', code: 'MT', purse: 4800 },
    { id: 't2', name: 'Bangalore Royals', code: 'BR', purse: 5200 },
    { id: 't3', name: 'Chennai Kings', code: 'CSK', purse: 3900 },
    { id: 't4', name: 'Kolkata Riders', code: 'KKR', purse: 4400 },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--accent-primary)] selection:text-[var(--accent-primary-fg)] pb-16">
      {/* FULL SCREEN ANIMATION OVERLAYS */}
      <SoldParticleExplosion
        active={showSoldExplosion}
        playerName="Jasprit Bumrah"
        teamName={leadingTeam}
        amount={activeBid}
        onComplete={() => setShowSoldExplosion(false)}
      />

      <SpotlightReveal
        active={showSpotlightReveal}
        title="FRANCHISE TEAMS REVEALED"
        subtitle="Official franchises confirmed for the 2026 IPL mega-auction"
        teams={demoTeams}
        onClose={() => setShowSpotlightReveal(false)}
        onComplete={() => {}}
      />

      {/* TOP HEADER & THEME PICKER (8-point spacing: px-6 py-4) */}
      <header className="sticky top-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-[16px] bg-[var(--bg-elevated)] border border-[var(--border-prominent)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-semibold text-lg tracking-tight">
                  Design &amp; Motion Laboratory
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--border-subtle)] uppercase">
                  pear.no aesthetic
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Boxy 16px geometry · 8-point rhythm · 1 display font · Physics animations
              </p>
            </div>
          </div>

          {/* THEME PICKER BUTTONS */}
          <div className="flex items-center gap-2 p-1 rounded-[16px] bg-[var(--bg-base)] border border-[var(--border-subtle)]">
            <button
              onClick={() => setTheme('pear')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                theme === 'pear'
                  ? 'bg-sky-500 text-black font-bold shadow'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <span>Pear.no (Cerulean &amp; Sand)</span>
            </button>
            <button
              onClick={() => setTheme('telemetry')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                theme === 'telemetry'
                  ? 'bg-[#d4ff00] text-black font-bold shadow'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <span>F1 Telemetry (Acid Volt)</span>
            </button>
            <button
              onClick={() => setTheme('heritage')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                theme === 'heritage'
                  ? 'bg-[#d4af37] text-black font-bold shadow'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <span>Lord's (Champagne Gold)</span>
            </button>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS FOR DEMO MODES (8-point spacing: gap-4, my-6) */}
      <div className="max-w-7xl mx-auto px-6 my-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('animations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'animations'
                ? 'bg-sky-500 text-black shadow'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Orbit size={15} /> 5 Interactive Motion Demos
          </button>
          <button
            onClick={() => setActiveTab('gavel')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'gavel'
                ? 'bg-sky-500 text-black shadow'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Gavel size={15} /> Live Gavel Command Deck
          </button>
        </div>

        {/* Live Quick Action Triggers */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSoldExplosion(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#1f2937] hover:bg-slate-700 border border-sky-500/40 text-sky-300 text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Sparkles size={13} /> Trigger "SOLD!" Explosion
          </button>
          <button
            onClick={() => {
              setShowImpactShake(true);
              setTimeout(() => setShowImpactShake(false), 2000);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#1f2937] hover:bg-slate-700 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Zap size={13} /> Trigger Camera Shake
          </button>
          <button
            onClick={() => setShowSpotlightReveal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#1f2937] hover:bg-slate-700 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Eye size={13} /> Trigger Spotlight Reveal
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 space-y-8">
        {/* ==========================================================================
            TAB 1: 5 INTERACTIVE MOTION DEMOS (REQUESTED REMOTION TEMPLATES)
            ========================================================================== */}
        {activeTab === 'animations' && (
          <div className="space-y-8">
            {/* DEMO 1: 3D ROTATING CAROUSEL */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono uppercase tracking-wider mb-1">
                    <Orbit size={12} /> Component #1: 3D Rotating Carousel
                  </div>
                  <h2 className="font-display font-semibold text-2xl text-[var(--text-primary)]">
                    Orbital Squad &amp; Lot Selector
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Calculated with cosine/sine orbit coordinates, depth scaling (0.6x to 1.0x), opacity falloff, and drag interaction.
                  </p>
                </div>
              </div>

              <RotatingCarousel
                items={demoCarouselItems}
                radius={240}
                height={380}
                speed={0.007}
              />
            </div>

            {/* DEMO 2 & 3: CAMERA SHAKE & URGENCY COUNTDOWN GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DEMO 2: CAMERA SHAKE (IMPACT PLAYER) */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 shadow-xl flex flex-col justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono uppercase tracking-wider mb-1">
                    <Zap size={12} /> Component #2: Multi-Frequency Camera Shake
                  </div>
                  <h3 className="font-display font-semibold text-xl text-[var(--text-primary)]">
                    Impact Player Arrival
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Simulates organic camera shake using sine &amp; cosine frequencies with decaying amplitude from 16px to 0px.
                  </p>
                </div>

                <CameraShakeImpact
                  active={showImpactShake}
                  playerName="TRAVIS HEAD"
                  role="Impact Batsman · Opening Lot"
                  basePrice={200}
                />

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowImpactShake(true);
                      setTimeout(() => setShowImpactShake(false), 2000);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    <Zap size={15} /> Trigger Impact Shake
                  </button>
                </div>
              </div>

              {/* DEMO 3: URGENCY COUNTDOWN TIMER */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 shadow-xl flex flex-col justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono uppercase tracking-wider mb-1">
                    <Clock size={12} /> Component #3: Countdown Timer Urgency
                  </div>
                  <h3 className="font-display font-semibold text-xl text-[var(--text-primary)]">
                    Last-Call Urgency Ticking
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Dynamic visual telemetry that enters an alert state when remaining clock drops below 5 seconds, triggering audio clicks and pulse rings.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center py-4">
                  <UrgencyCountdownTimer
                    seconds={timerSeconds}
                    maxSeconds={15}
                    isActive={timerRunning}
                    size="large"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setTimerRunning(!timerRunning);
                      if (!timerRunning && timerSeconds === 0) setTimerSeconds(15);
                    }}
                    className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    {timerRunning ? <Pause size={15} /> : <Play size={15} />}
                    <span>{timerRunning ? 'Pause Clock' : 'Start Countdown'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setTimerSeconds(4);
                      setTimerRunning(true);
                    }}
                    className="px-4 py-3 rounded-xl bg-[#1f2937] hover:bg-slate-700 border border-[var(--border-subtle)] text-rose-400 font-bold text-xs uppercase"
                    title="Jump directly to urgent last-call state"
                  >
                    Jump to 4s
                  </button>
                  <button
                    onClick={() => {
                      setTimerSeconds(15);
                      setTimerRunning(false);
                    }}
                    className="p-3 rounded-xl bg-[#1f2937] hover:bg-slate-700 border border-[var(--border-subtle)] text-slate-300"
                    title="Reset clock"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* DEMO 4 & 5: SPOTLIGHT & SOLD EXPLOSION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SPOTLIGHT REVEAL PREVIEW */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 shadow-xl flex flex-col justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono uppercase tracking-wider mb-1">
                    <Eye size={12} /> Component #4: Spotlight Clip Reveal
                  </div>
                  <h3 className="font-display font-semibold text-xl text-[var(--text-primary)]">
                    Franchise Team Spotlight
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Circular clip-path expansion (<code className="text-sky-400">circle(radius% at 50% 50%)</code>) with shimmering edge radial glow.
                  </p>
                </div>
                <button
                  onClick={() => setShowSpotlightReveal(true)}
                  className="py-3 rounded-xl bg-[#1f2937] hover:bg-slate-700 border border-sky-500/40 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Eye size={15} className="text-sky-400" /> Launch Full-Screen Spotlight Reveal
                </button>
              </div>

              {/* SOLD EXPLOSION PREVIEW */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 shadow-xl flex flex-col justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono uppercase tracking-wider mb-1">
                    <Sparkles size={12} /> Component #5: "SOLD!" Particle Explosion
                  </div>
                  <h3 className="font-display font-semibold text-xl text-[var(--text-primary)]">
                    150-Particle Hammer Impact
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Spring dynamics radial expansion with rotational angular velocity, replacing generic confetti with high-stakes hammer impact.
                  </p>
                </div>
                <button
                  onClick={() => setShowSoldExplosion(true)}
                  className="py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <Sparkles size={15} /> Trigger "SOLD!" Particle Explosion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================================
            TAB 2: LIVE GAVEL COMMAND DECK IN PEAR.NO AESTHETIC
            ========================================================================== */}
        {activeTab === 'gavel' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: UPCOMING QUEUE (4 Cols) */}
            <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 shadow-xl flex flex-col justify-between h-[680px]">
              <div>
                <div className="flex justify-between items-center pb-4 mb-4 border-b border-[var(--border-subtle)]">
                  <div>
                    <h2 className="font-display font-semibold text-base text-[var(--text-primary)]">Upcoming Player Queue</h2>
                    <p className="text-xs text-[var(--text-secondary)]">5 available in current lot</p>
                  </div>
                  <span className="font-mono text-xs px-2 py-1 rounded bg-[var(--bg-elevated)] text-sky-400">
                    SET #1
                  </span>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
                  {demoCarouselItems.map((p, idx) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-sky-500/40 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-bold text-[var(--text-secondary)]">0{idx + 1}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{p.title}</h4>
                          <span className="text-[10px] text-[var(--text-secondary)] block truncate">{p.subtitle}</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-sky-400 shrink-0">
                        {p.price} L
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <Shield size={14} className="text-sky-400 shrink-0" />
                <span>CricHeroes verified roster active</span>
              </div>
            </div>

            {/* CENTER: GAVEL COMMAND DECK (8 Cols) */}
            <div className="lg:col-span-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 shadow-xl flex flex-col justify-between h-[680px]">
              <div>
                <div className="flex justify-between items-center pb-4 mb-6 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <Gavel size={18} className="text-sky-400" />
                    <h2 className="font-display font-semibold text-lg text-[var(--text-primary)]">
                      Authoritative Gavel Block
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase">Live Telemetry</span>
                  </div>
                </div>

                {/* ACTIVE LOT HERO CARD */}
                <div className="p-6 rounded-[16px] bg-[var(--bg-base)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-[16px] bg-[#1f2937] border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-lg">
                      <Award size={36} />
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-500/10 border border-sky-500/30 text-sky-300">
                        LOT #14 · MARQUEE FAST BOWLER
                      </span>
                      <h3 className="font-display font-semibold text-2xl sm:text-3xl text-[var(--text-primary)] mt-1">
                        Jasprit Bumrah
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        India · Right-Arm Fast · Base 200 Lakhs
                      </p>
                    </div>
                  </div>

                  {/* ACTIVE BID TELEMETRY */}
                  <div className="text-center sm:text-right">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                      CURRENT BID
                    </span>
                    <div className="font-mono text-4xl sm:text-5xl font-black text-sky-400 tabular-nums">
                      {activeBid} <span className="text-lg font-sans font-normal text-[var(--text-secondary)]">L</span>
                    </div>
                    <div className="text-xs font-semibold text-[var(--text-primary)] mt-1 flex items-center gap-1.5 justify-center sm:justify-end">
                      <span className="text-[var(--text-secondary)]">Leader:</span>
                      <span className="text-sky-300 font-mono font-bold">{leadingTeam} ({leadingCode})</span>
                    </div>
                  </div>
                </div>

                {/* COUNTDOWN CLOCK ROW */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-3">
                    <Clock size={20} className={timerSeconds <= 4 ? 'text-rose-400 animate-bounce' : 'text-sky-400'} />
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {timerSeconds <= 4 ? 'LAST CALL WARNING' : 'AUCTIONEER COUNTDOWN'}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">15 seconds per call cycle</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="font-mono text-2xl font-black text-sky-400 tabular-nums">
                      {timerSeconds}s
                    </div>
                    <button
                      onClick={() => setTimerRunning(!timerRunning)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-bold hover:text-sky-400 transition-colors"
                    >
                      {timerRunning ? 'Pause' : 'Start'}
                    </button>
                  </div>
                </div>

                {/* BID INCREMENT TRIGGERS */}
                <div className="mt-6">
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
                    Quick Bid Increments
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 20, 50].map((inc) => (
                      <button
                        key={inc}
                        onClick={() => handleBid(inc)}
                        className="py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-slate-800 border border-[var(--border-subtle)] hover:border-sky-500/50 text-sky-300 font-mono font-bold text-xs transition-all active:scale-95"
                      >
                        +{inc} Lakhs
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* GAVEL DECISION CONTROLS */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[var(--border-subtle)]">
                <button
                  onClick={handleSold}
                  className="py-4 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-transform"
                >
                  <Gavel size={16} />
                  <span>[S] SOLD</span>
                </button>
                <button
                  onClick={handleUnsold}
                  className="py-4 rounded-xl bg-[#1f2937] hover:bg-slate-700 active:scale-95 text-rose-400 font-black text-xs uppercase tracking-wider border border-rose-500/40 flex items-center justify-center gap-2 transition-transform"
                >
                  <span>[U] UNSOLD</span>
                </button>
                <button
                  onClick={handleReset}
                  className="py-4 rounded-xl bg-[var(--bg-elevated)] hover:bg-slate-800 active:scale-95 text-[var(--text-secondary)] hover:text-white font-bold text-xs uppercase tracking-wider border border-[var(--border-subtle)] flex items-center justify-center gap-2 transition-transform"
                >
                  <RotateCcw size={14} />
                  <span>RESET</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
