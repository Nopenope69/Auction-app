import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'info' | 'warning' | 'success';
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-md w-[92vw] sm:w-auto"
        >
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-[12px] shadow-2xl border backdrop-blur-md ${
              toast.type === 'warning'
                ? 'bg-[var(--status-alert)]/20 border-[var(--status-alert)]/50 text-[var(--text-primary)]'
                : toast.type === 'success'
                ? 'bg-[var(--status-success)]/20 border-[var(--status-success)]/50 text-[var(--text-primary)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)]'
            }`}
          >
            {toast.type === 'warning' ? (
              <AlertCircle size={18} className="text-[var(--status-alert)] shrink-0" />
            ) : toast.type === 'success' ? (
              <CheckCircle size={18} className="text-[var(--status-success)] shrink-0" />
            ) : (
              <Info size={18} className="text-[var(--accent-sky,#82C8E5)] shrink-0" />
            )}
            <div className="text-xs font-semibold select-none">{toast.message}</div>
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-[6px] hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors ml-1 focus-ring"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
