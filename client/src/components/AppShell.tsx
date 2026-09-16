import React, { useState } from 'react';
import {
  Gavel,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Keyboard,
  Link2,
  Download,
  X,
  Shield,
  Award,
  Users,
  AlertTriangle,
  Layers,
  Orbit,
  Palette,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioEngine } from './AudioEngine';
import { AIAuctioneer } from './AIAuctioneer';
import { FloatingReactions } from './FloatingReactions';
import { ThemeMode, getInitialTheme, applyTheme } from '../lib/theme';
import type { Role, ConnectionStatus, Reaction, AuctionErrorEvent } from '../hooks/useAuction';

interface AppShellProps {
  name: string;
  roomId: string;
  status: 'setup' | 'live' | 'paused' | 'completed';
  connectionStatus: ConnectionStatus;
  role: Role;
  teamCode?: string;
  teamName?: string;
  lastError?: AuctionErrorEvent | null;
  clearError?: () => void;
  reactionEmojiList?: Reaction[];
  onOpenTeamLinks?: () => void;
  onExportCsv?: () => void;
  onEndAuction?: () => void;
  onResetAuction?: () => void;
  onPurgeData?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  name,
  roomId,
  status,
  connectionStatus,
  role,
  teamCode,
  teamName,
  lastError,
  clearError,
  reactionEmojiList = [],
  onOpenTeamLinks,
  onExportCsv,
  onEndAuction,
  onResetAuction,
  onPurgeData,
  children,
}) => {
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  const cycleTheme = () => {
    const next: ThemeMode =
      theme === 'telemetry' ? 'pear' : theme === 'pear' ? 'heritage' : 'telemetry';
    setTheme(next);
    applyTheme(next);
  };

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 1500);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    AIAuctioneer.toggle(next);
    if (next) AudioEngine.init();
  };

  const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  const spectatorUrl = `${base}?room=${roomId}&view=spectator`;
  const broadcastUrl = `${base}?room=${roomId}&view=broadcast`;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-sans relative selection:bg-sky-500/30">
      {/* Floating live reaction layer */}
      <FloatingReactions reactions={reactionEmojiList} />

      {/* Disconnected / Degraded Mode Persistent Banner */}
      {connectionStatus !== 'connected' && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-6 py-2 text-xs font-semibold text-rose-200 flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <WifiOff size={14} className="text-rose-400 shrink-0" />
            <span>
              {connectionStatus === 'connecting'
                ? 'Reconnecting to auction server... Bidding and gavel actions temporarily locked.'
                : 'Connection lost. Operating in cached read-only mode.'}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-rose-300">
            {connectionStatus}
          </span>
        </div>
      )}

      {/* Server Rejection Toast */}
      <AnimatePresence>
        {lastError && (
          <motion.div
            key={lastError.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] px-4 py-3 rounded-[16px] bg-[#111827] border border-rose-500/50 text-rose-100 text-xs font-semibold shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
              <span>{lastError.message}</span>
            </div>
            {clearError && (
              <button
                onClick={clearError}
                className="text-rose-400 hover:text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded"
              >
                Dismiss
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Global Header (8-point rhythm: px-6 py-3.5) */}
      <header className="sticky top-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand / Tournament & Room Badge */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-[var(--bg-elevated)] border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm">
                <Gavel size={16} />
              </div>
              <span className="font-display font-semibold text-sm text-[#f2f1ed] tracking-tight hidden sm:inline truncate max-w-[220px]" title={name || 'Auction'}>
                {name || 'Cricket Auction'}
              </span>
            </div>

            {/* Room Code Badge */}
            <button
              onClick={handleCopyRoom}
              className="px-3 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-sky-500/40 text-xs font-mono font-bold text-[#f2f1ed] flex items-center gap-1.5 transition-colors focus-ring"
              title="Click to copy Room Code"
            >
              <span className="text-[#8c8a82] text-[10px] font-sans font-medium uppercase">Room:</span>
              <span className="text-sky-400">{roomId}</span>
              {copiedRoom ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-[#8c8a82]" />}
            </button>

            {/* WebSocket Status Indicator */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse-subtle' : 'bg-rose-400'
                }`}
              />
              <span className="uppercase text-[10px] tracking-wider">{connectionStatus}</span>
            </div>
          </div>

          {/* Center: Auction State Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                status === 'live'
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                  : status === 'paused'
                  ? 'bg-slate-800 border-amber-500/30 text-amber-400'
                  : status === 'completed'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {status === 'live' && <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />}
              {status === 'completed' && <Award size={13} className="text-emerald-400" />}
              <span>{status === 'live' ? 'Live Bidding' : status}</span>
            </span>
          </div>

          {/* Right: Actions, Sound, Role, Tools */}
          <div className="flex items-center gap-2">
            {/* Theme Switcher Pill */}
            <button
              onClick={cycleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-slate-800 border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 text-xs font-mono transition-colors focus-ring"
              title={`Active Theme: ${theme === 'telemetry' ? 'F1 Pit-Wall Telemetry' : theme === 'pear' ? 'Pear.no' : "Lord's Heritage"} (Click to cycle)`}
              aria-label="Toggle Theme"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    theme === 'telemetry' ? '#d4ff00' : theme === 'pear' ? '#38bdf8' : '#d4af37',
                }}
              />
              <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                {theme === 'telemetry' ? 'F1 Telemetry' : theme === 'pear' ? 'Pear.no' : "Lord's"}
              </span>
            </button>

            {/* Design & Motion Lab Link */}
            <a
              href="/?view=preview"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-sky-500/40 text-xs text-[#8c8a82] hover:text-sky-300 transition-colors"
              title="Open Design & Motion Lab"
            >
              <Orbit size={13} className="text-sky-400" />
              <span className="font-mono text-[11px]">Lab</span>
            </a>

            {/* Role Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-semibold text-[#f2f1ed]">
              {role === 'admin' ? (
                <>
                  <Shield size={13} className="text-sky-400" />
                  <span>Auctioneer</span>
                </>
              ) : role === 'team' ? (
                <>
                  <Users size={13} className="text-sky-400" />
                  <span>{teamName ? `${teamName} (${teamCode})` : 'Bidder'}</span>
                </>
              ) : (
                <span>Spectator</span>
              )}
            </div>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-slate-800 border border-[var(--border-subtle)] text-[#f2f1ed] transition-colors focus-ring"
              title={soundEnabled ? 'Mute sound & commentary' : 'Unmute sound & commentary'}
              aria-label="Toggle Sound"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-rose-400" />}
            </button>

            {/* Share & Public Links Modal Trigger */}
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-slate-800 border border-[var(--border-subtle)] text-[#f2f1ed] transition-colors focus-ring"
              title="Share links (Spectator, OBS Broadcast, Teams)"
              aria-label="Share Links"
            >
              <Link2 size={16} />
            </button>

            {/* Keyboard Shortcuts Trigger */}
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-slate-800 border border-[var(--border-subtle)] text-[#f2f1ed] transition-colors focus-ring"
              title="Keyboard shortcuts cheatsheet"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard size={16} />
            </button>

            {/* Admin Utility Dropdown / Actions */}
            {role === 'admin' && (
              <div className="flex items-center gap-1 pl-2 border-l border-[var(--border-subtle)]">
                {onOpenTeamLinks && (
                  <button
                    onClick={onOpenTeamLinks}
                    className="p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-slate-800 border border-[var(--border-subtle)] text-[#f2f1ed] transition-colors focus-ring"
                    title="View all franchise private bidder access links"
                  >
                    <Users size={16} className="text-sky-400" />
                  </button>
                )}
                {onExportCsv && (
                  <button
                    onClick={onExportCsv}
                    className="p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-slate-800 border border-[var(--border-subtle)] text-[#f2f1ed] transition-colors focus-ring"
                    title="Export tournament auction results CSV"
                  >
                    <Download size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* KEYBOARD SHORTCUTS MODAL (Boxy 16px geometry) */}
      <AnimatePresence>
        {showShortcutsModal && (
          <div className="fixed inset-0 z-50 bg-[#0b0a09]/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111827] border border-[var(--border-subtle)] rounded-[16px] p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-white font-bold text-base font-display">
                  <Keyboard size={18} className="text-sky-400" />
                  <span>Auctioneer Keyboard Hotkeys</span>
                </div>
                <button
                  onClick={() => setShowShortcutsModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-[#8c8a82] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#0b0a09] border border-[var(--border-subtle)]">
                  <span className="text-[#f2f1ed] font-medium">Start / Pause Countdown Timer</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#1f2937] border border-slate-700 font-mono font-bold text-sky-300">Space</kbd>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#0b0a09] border border-[var(--border-subtle)]">
                  <span className="text-[#f2f1ed] font-medium">Mark Active Player SOLD</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#1f2937] border border-slate-700 font-mono font-bold text-emerald-300">S</kbd>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#0b0a09] border border-[var(--border-subtle)]">
                  <span className="text-[#f2f1ed] font-medium">Mark Active Player UNSOLD</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#1f2937] border border-slate-700 font-mono font-bold text-rose-300">U</kbd>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#0b0a09] border border-[var(--border-subtle)]">
                  <span className="text-[#f2f1ed] font-medium">Undo Last Action (Up to 3 deep)</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#1f2937] border border-slate-700 font-mono font-bold text-slate-200">Z</kbd>
                </div>
              </div>

              <p className="text-[11px] text-[#8c8a82] mt-4 leading-relaxed">
                * Note: Hotkeys are strictly guarded and suspended when typing in any input field or modal.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE LINKS MODAL (Boxy 16px geometry) */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 bg-[#0b0a09]/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111827] border border-[var(--border-subtle)] rounded-[16px] p-6 max-w-lg w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-white font-bold text-base font-display">
                  <Link2 size={18} className="text-sky-400" />
                  <span>Public &amp; Stream Broadcast Links</span>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-[#8c8a82] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#8c8a82] font-semibold mb-1">Spectator Arena URL (For fans &amp; live viewing)</label>
                  <CopyInput value={spectatorUrl} />
                </div>
                <div>
                  <label className="block text-[#8c8a82] font-semibold mb-1">OBS / Stream Broadcast Lower-Third Overlay</label>
                  <CopyInput value={broadcastUrl} />
                </div>
              </div>

              {role === 'admin' && onOpenTeamLinks && (
                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex justify-end">
                  <button
                    onClick={() => {
                      setShowShareModal(false);
                      onOpenTeamLinks();
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs flex items-center gap-1.5 focus-ring"
                  >
                    <Users size={14} /> Open Private Team Links
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CopyInput: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value}
        className="flex-1 bg-[#0b0a09] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[#f2f1ed] font-mono text-xs outline-none focus:border-sky-400 select-all"
        onFocus={(e) => e.target.select()}
      />
      <button
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="px-3.5 py-2 rounded-xl bg-[#1f2937] hover:bg-slate-700 text-[#f2f1ed] font-semibold transition-colors shrink-0 focus-ring"
      >
        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
};
