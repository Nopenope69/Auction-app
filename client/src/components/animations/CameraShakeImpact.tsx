import React, { useEffect, useState } from 'react';
import { Zap, Sparkles } from 'lucide-react';

interface CameraShakeImpactProps {
  active: boolean;
  playerName?: string;
  role?: string;
  basePrice?: number;
  onComplete?: () => void;
  durationFrames?: number;
  children?: React.ReactNode;
}

export const CameraShakeImpact: React.FC<CameraShakeImpactProps> = ({
  active,
  playerName = 'IMPACT PLAYER',
  role = 'Marquee Superstar',
  basePrice = 200,
  onComplete,
  durationFrames = 75,
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

  // Amplitude decays from 16px to 0 over the duration
  const progress = Math.min(1, frame / durationFrames);
  const amplitude = active ? Math.max(0, (1 - progress) * 16) : 0;

  // Organic shake using dual sine/cosine frequencies
  const shakeX = Math.sin(frame * 0.8) * amplitude;
  const shakeY = Math.cos(frame * 1.1) * amplitude;

  return (
    <div
      style={{
        transform: `translate(${shakeX}px, ${shakeY}px)`,
        transition: amplitude === 0 ? 'transform 0.2s ease-out' : 'none',
      }}
      className="relative w-full"
    >
      {children ? (
        children
      ) : (
        <div
          style={{
            background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '16px',
            boxShadow: '0 0 40px rgba(1, 81, 134, 0.25)',
          }}
          className="p-8 sm:p-10 flex flex-col items-center text-center select-none"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[var(--accent-primary)]/20 border border-[var(--border-prominent)] text-[var(--accent-sky)] text-xs font-mono uppercase tracking-widest mb-3">
            <Zap size={14} className="text-[var(--accent-sky)] animate-pulse" /> Marquee Lot Calling
          </div>

          <h1 className="text-white text-4xl sm:text-5xl font-black uppercase tracking-wider font-sans m-0">
            {playerName}
          </h1>

          {/* Decorative Gradient Bar */}
          <div
            style={{
              width: '80px',
              height: '4px',
              background: 'linear-gradient(90deg, #0047ab, #82c8e5)',
              margin: '1.25rem 0',
              borderRadius: '2px',
            }}
          />

          <p className="text-[var(--text-secondary)] text-sm font-semibold max-w-md m-0">
            {role} · Base Price <span className="font-mono text-[var(--accent-sky)] font-bold">{basePrice} Lakhs</span>
          </p>
        </div>
      )}
    </div>
  );
};
