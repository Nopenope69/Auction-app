import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

interface InlineConfirmProps {
  prompt?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

export const InlineConfirm: React.FC<InlineConfirmProps> = ({
  prompt = 'Delete?',
  onConfirm,
  onCancel,
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  variant = 'danger',
}) => {
  return (
    <div
      role="alert"
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] border text-xs shadow-md animate-in fade-in duration-150 ${
        variant === 'danger'
          ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]'
          : 'bg-[#c2a365]/15 border-[#c2a365]/40 text-[#c2a365]'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <AlertTriangle size={12} className="shrink-0" />
      <span className="font-semibold">{prompt}</span>
      <button
        type="button"
        onClick={onConfirm}
        className="px-2 py-0.5 rounded-[6px] bg-[#ef4444] hover:bg-red-600 text-white font-bold text-[11px] transition-colors flex items-center gap-0.5 focus-ring"
        title={confirmLabel}
      >
        <Check size={11} />
        <span>{confirmLabel}</span>
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-0.5 rounded-[6px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium text-[11px] transition-colors flex items-center gap-0.5 focus-ring border border-[var(--border-subtle)]"
        title={cancelLabel}
      >
        <X size={11} />
        <span>{cancelLabel}</span>
      </button>
    </div>
  );
};
