import React, { useEffect, useState, useMemo } from 'react';
import { Award, Gavel } from 'lucide-react';

interface SoldParticleExplosionProps {
  active: boolean;
  playerName?: string;
  teamName?: string;
  amount?: number | string;
  onComplete?: () => void;
  durationFrames?: number;
}

const PARTICLE_COUNT = 150;

export const SoldParticleExplosion: React.FC<SoldParticleExplosionProps> = ({
  active,
  playerName,
  teamName,
  amount,
  onComplete,
  durationFrames = 90,
}) => {
  const [frame, setFrame] = useState(0);

  // Pre-seed particle random seeds so they remain deterministic throughout the animation
  const particleSeeds = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
      baseAngle: (i / PARTICLE_COUNT) * Math.PI * 2,
      targetScale: ((i * 73) % 100) / 100 * 1.2 + 0.3,
      targetDistance: 160 + (((i * 97) % 100) / 100) * 120,
      hue: (i % 2 === 0) ? (200 + (i % 40)) : (42 + (i % 15)), // Mix of Pear Cerulean & Pear Gold
      size: 6 + (i % 8),
    }));
  }, []);

  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }

    let current = 0;
    let animId: number;

    const tick = () => {
      current += 1;
      setFrame(current);
      if (current < durationFrames) {
        animId = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [active, durationFrames, onComplete]);

  if (!active || frame >= durationFrames) return null;

  // Simple spring-damping approximation for distance and scale
  const progress = Math.min(1, frame / durationFrames);
  const textScale = Math.min(1, frame / 12) + Math.sin(Math.min(Math.PI, (frame / 12) * Math.PI)) * 0.15;
  const opacity = Math.max(0, 1 - (frame / durationFrames));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      {/* Darkened backdrop flash */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: Math.max(0, 0.8 - progress) }}
      />

      {/* Center "SOLD!" Text Banner */}
      <div
        style={{
          transform: `scale(${textScale})`,
          opacity: Math.min(1, (1 - progress) * 1.5),
          textShadow: '0 0 30px rgba(242, 241, 237, 0.9), 0 0 60px rgba(56, 189, 248, 0.6)',
        }}
        className="relative z-10 flex flex-col items-center justify-center text-center px-6"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs uppercase tracking-widest mb-3">
          <Gavel size={14} /> Official Sale Confirmed
        </div>

        <h1 className="text-6xl sm:text-8xl font-black tracking-tight text-white uppercase font-sans drop-shadow-2xl">
          SOLD!
        </h1>

        {(playerName || teamName) && (
          <div className="mt-3 p-3 px-6 rounded-2xl bg-[#111827]/90 border border-sky-500/40 shadow-2xl backdrop-blur-md flex items-center gap-3">
            {playerName && <span className="text-white font-bold text-lg">{playerName}</span>}
            {teamName && (
              <span className="text-sky-300 font-mono text-base font-semibold">
                → {teamName}
              </span>
            )}
            {amount !== undefined && (
              <span className="text-amber-400 font-mono font-black text-lg tabular-nums">
                ({amount} L)
              </span>
            )}
          </div>
        )}
      </div>

      {/* 150 Radial Exploding Particles */}
      {particleSeeds.map((p, i) => {
        const rotationSpeed = 0.02;
        const rotatingAngle = p.baseAngle + frame * rotationSpeed;
        const springDist = p.targetDistance * (1 - Math.exp(-frame / 14));
        const x = Math.cos(rotatingAngle) * springDist;
        const y = Math.sin(rotatingAngle) * springDist;
        const scale = p.targetScale * (1 - Math.exp(-frame / 8));

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: `hsl(${p.hue}, 85%, 65%)`,
              borderRadius: '50%',
              opacity,
              boxShadow: `0 0 12px hsl(${p.hue}, 85%, 65%)`,
            }}
          />
        );
      })}
    </div>
  );
};
