import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Gavel, X } from 'lucide-react';
import { SoldParticleExplosion } from '../animations/SoldParticleExplosion';
import { AudioEngine } from '../AudioEngine';

interface WinCelebrationOverlayProps {
  isOpen: boolean;
  playerName?: string;
  teamName?: string;
  amount?: number | string;
  onClose: () => void;
}

export const WinCelebrationOverlay: React.FC<WinCelebrationOverlayProps> = ({
  isOpen,
  playerName,
  teamName,
  amount,
  onClose,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  // Safe sound trigger & auto-dismiss timer
  useEffect(() => {
    if (!isOpen) return;

    try {
      AudioEngine.playSoldSound();
    } catch {
      // Audio autoplay policy fail gracefully
    }

    // Auto-dismiss after 4.5 seconds so auction state is not blocked
    const timer = setTimeout(() => {
      onClose();
    }, 4500);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0a09]/85 backdrop-blur-md cursor-pointer select-none"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="win-celebration-title"
        >
          {/* Optional decorative particle explosion - suppressed when prefers-reduced-motion is active */}
          {!prefersReducedMotion && (
            <SoldParticleExplosion
              active={isOpen}
              playerName={playerName}
              teamName={teamName}
              amount={amount}
              durationFrames={110}
            />
          )}

          {/* Primary High-Contrast P0 Transaction Receipt Card */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative bg-[var(--bg-surface)] border-2 border-[var(--status-success)]/60 rounded-[16px] p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,210,132,0.25)] text-center flex flex-col items-center gap-3 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-[6px] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors focus-ring"
              aria-label="Dismiss win banner"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-[12px] bg-[var(--status-success)]/20 border border-[var(--status-success)]/40 flex items-center justify-center text-[var(--status-success)] mb-1">
              <Gavel size={28} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[var(--status-success)]/15 text-[var(--status-success)] border border-[var(--status-success)]/30 text-xs font-mono font-black uppercase tracking-wider">
              <Award size={14} />
              <span>PLAYER SIGNED TO SQUAD</span>
            </div>

            <h2 id="win-celebration-title" className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)] leading-tight">
              {playerName || 'Player'}
            </h2>

            <div className="flex flex-col items-center gap-1 my-1">
              <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                Winning Bid
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-[var(--accent-sky,#82C8E5)] tabular-nums tracking-tight">
                {amount} <span className="text-base font-sans text-[var(--text-secondary)]">Lakhs</span>
              </div>
            </div>

            {teamName && (
              <div className="text-sm font-semibold text-[var(--accent-sky,#82C8E5)] bg-[var(--bg-base)] px-4 py-1.5 rounded-[8px] border border-[var(--border-subtle)]">
                Acquired by <span className="text-[var(--text-primary)] font-bold">{teamName}</span>
              </div>
            )}

            <div className="text-[11px] text-[var(--text-secondary)] mt-2">
              Added to your franchise squad. Auto-dismissing in 4s (or press Esc).
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
