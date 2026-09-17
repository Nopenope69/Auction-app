import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Space', label: 'Start / Pause Countdown Timer', description: 'Toggles the lot clock' },
  { key: 'S', label: 'Sold (Gavel Drop)', description: 'Awards active player to highest bidder' },
  { key: 'U', label: 'Mark Unsold', description: 'Passes active player without sale' },
  { key: 'Z', label: 'Undo Last Gavel Strike', description: 'Restores player and refunds purse' },
  { key: '?', label: 'Open Shortcuts Cheatsheet', description: 'Displays this reference modal' },
  { key: 'Esc', label: 'Dismiss Modals / Overlays', description: 'Closes any open overlay or dialog' },
];

export const KeyboardShortcutModal: React.FC<KeyboardShortcutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-6 max-w-lg w-full shadow-2xl flex flex-col"
          >
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-sm">
                <Keyboard className="text-[var(--accent-sky)]" size={18} />
                <h3 id="shortcuts-title" className="font-display text-base">Auctioneer Keyboard Controls</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-[6px] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors focus-ring"
                aria-label="Close shortcuts modal"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
              Keyboard shortcuts are armed on the Live Gavel Stage. They are automatically suppressed when typing inside an input field or when a modal is open.
            </p>

            <div className="space-y-2.5">
              {SHORTCUTS.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between p-2 rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-[var(--text-primary)]">{s.label}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{s.description}</div>
                  </div>
                  <kbd className="px-2.5 py-1 rounded-[6px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-mono font-bold text-[var(--accent-sky)] shadow-sm shrink-0">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[8px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors focus-ring"
              >
                Close (Esc)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
