import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, X } from 'lucide-react';

interface TeamItem {
  id: string;
  name: string;
  code: string;
  purse: number;
}

interface SpotlightRevealProps {
  active: boolean;
  title?: string;
  subtitle?: string;
  teams?: TeamItem[];
  onComplete?: () => void;
  onClose?: () => void;
  durationFrames?: number;
  children?: React.ReactNode;
}

export const SpotlightReveal: React.FC<SpotlightRevealProps> = ({
  active,
  title = 'FRANCHISE TEAMS REVEALED',
  subtitle = 'Official squads entering the auction battleground',
  teams = [],
  onComplete,
  onClose,
  durationFrames = 90,
  children,
}) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }

    let current = 0;
    let animId: number;

    const loop = () => {
      current += 1;
      setFrame(current);
      if (current < durationFrames) {
        animId = requestAnimationFrame(loop);
      } else {
        onComplete?.();
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [active, durationFrames, onComplete]);

  if (!active) return null;

  // Clip-path radius grows from 0% to 100%
  const animProgress = Math.min(1, frame / (durationFrames * 0.8));
  const radius = animProgress * 100;

  // Glow opacity peaks mid-animation then fades
  const midPoint = durationFrames * 0.4;
  const glowOpacity = frame < midPoint
    ? (frame / midPoint) * 0.8
    : Math.max(0, (1 - (frame - midPoint) / (durationFrames * 0.6)) * 0.8);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-[#0b0a09]/95 backdrop-blur-xl">
      {/* Close button if manual dismiss */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      )}

      {/* Revealed content behind clip */}
      <div
        style={{
          clipPath: `circle(${radius}% at 50% 50%)`,
          background: 'linear-gradient(135deg, #0b0a09 0%, #111827 50%, #1f2937 100%)',
        }}
        className="absolute inset-0 flex flex-col items-center justify-center p-6 select-none"
      >
        {children ? (
          children
        ) : (
          <div className="max-w-3xl w-full flex flex-col items-center text-center">
            {/* Decorative top bar */}
            <div
              style={{
                width: '90px',
                height: '4px',
                background: 'linear-gradient(90deg, #0047ab, #82c8e5)',
                borderRadius: '2px',
                marginBottom: '1.5rem',
              }}
            />

            <h1 className="text-white text-3xl sm:text-5xl font-black uppercase tracking-wider font-sans m-0">
              {title}
            </h1>

            <p className="text-[var(--accent-sky)] text-sm sm:text-base font-medium mt-3 mb-8 max-w-lg">
              {subtitle}
            </p>

            {/* Teams Grid */}
            {teams.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mb-8">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-[16px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col items-center shadow-xl"
                  >
                    <div className="w-12 h-12 rounded-[10px] bg-[var(--bg-base)] border border-[var(--border-prominent)] flex items-center justify-center font-mono font-black text-[var(--accent-sky)] text-lg mb-2">
                      {t.code}
                    </div>
                    <span className="text-[var(--text-primary)] font-bold text-xs truncate max-w-[120px]">{t.name}</span>
                    <span className="font-mono text-xs text-[var(--accent-sky)] font-semibold mt-1">{t.purse}L</span>
                  </div>
                ))}
              </div>
            )}

            {/* Decorative bottom bar */}
            <div
              style={{
                width: '90px',
                height: '4px',
                background: 'linear-gradient(90deg, #82c8e5, #0047ab)',
                borderRadius: '2px',
                marginTop: '1rem',
              }}
            />
          </div>
        )}
      </div>

      {/* Glow at the edge of the expanding circle */}
      <div
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent ${Math.max(0, radius - 3)}%, rgba(56, 189, 248, ${glowOpacity}) ${radius}%, transparent ${radius + 4}%)`,
          pointerEvents: 'none',
        }}
        className="absolute inset-0"
      />
    </div>
  );
};
