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
                ? 'bg-[#ef4444]/20 border-[#ef4444]/50 text-[#f2f1ed]'
                : toast.type === 'success'
                ? 'bg-[#10b981]/20 border-[#10b981]/50 text-[#f2f1ed]'
                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[#f2f1ed]'
            }`}
          >
            {toast.type === 'warning' ? (
              <AlertCircle size={18} className="text-[#ef4444] shrink-0" />
            ) : toast.type === 'success' ? (
              <CheckCircle size={18} className="text-[#10b981] shrink-0" />
            ) : (
              <Info size={18} className="text-[#38bdf8] shrink-0" />
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
