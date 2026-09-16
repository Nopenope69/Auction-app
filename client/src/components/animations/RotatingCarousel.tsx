import React, { useEffect, useRef, useState, useCallback } from 'react';
import { User, Sparkles, ChevronRight } from 'lucide-react';

export interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  price?: string | number;
  photoUrl?: string;
  color?: string;
}

interface RotatingCarouselProps {
  items: CarouselItem[];
  onSelectItem?: (item: CarouselItem) => void;
  radius?: number;
  autoRotate?: boolean;
  speed?: number;
  height?: number | string;
}

export const RotatingCarousel: React.FC<RotatingCarouselProps> = ({
  items,
  onSelectItem,
  radius = 230,
  autoRotate = true,
  speed = 0.008,
  height = 360,
}) => {
  const [angle, setAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const lastXRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // 60fps continuous rotation loop
  useEffect(() => {
    let currentAngle = angle;
    const loop = () => {
      if (autoRotate && !isDragging && !isHovered) {
        currentAngle += speed;
        setAngle(currentAngle);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoRotate, isDragging, isHovered, speed]);

  // Mouse & Touch Drag interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    lastXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    setAngle((prev) => prev + deltaX * 0.007);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const rotateToFront = (index: number) => {
    const targetAngle = -((index * Math.PI * 2) / items.length);
    // Smooth transition to target
    setAngle(targetAngle);
  };

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col items-center justify-center select-none cursor-grab active:cursor-grabbing"
      style={{
        height,
        background: 'linear-gradient(180deg, #0b0a09 0%, #111827 50%, #0b0a09 100%)',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Subtle orbital ring */}
      <div
        className="absolute rounded-full border border-sky-500/10 pointer-events-none"
        style={{
          width: radius * 2 + 100,
          height: 120,
          transform: 'rotateX(75deg)',
          boxShadow: '0 0 40px rgba(1, 81, 134, 0.15)',
        }}
      />

      {/* Orbiting Cards Container */}
      <div className="relative w-full max-w-xl h-72 flex items-center justify-center">
        {items.map((item, i) => {
          const cardAngle = angle + (i * Math.PI * 2) / items.length;
          const x = Math.sin(cardAngle) * radius;
          const z = Math.cos(cardAngle); // range -1 to 1
          const normalizedZ = (z + 1) / 2; // range 0 to 1
          const cardScale = 0.6 + normalizedZ * 0.4; // range 0.6 to 1.0
          const cardOpacity = 0.3 + normalizedZ * 0.7; // range 0.3 to 1.0
          const zIndex = Math.round(normalizedZ * 100);
          const isFront = normalizedZ > 0.85;

          return (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                rotateToFront(i);
                onSelectItem?.(item);
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translateX(${x}px) scale(${cardScale})`,
                opacity: cardOpacity,
                zIndex,
                width: '190px',
                height: '240px',
                borderRadius: '16px',
                background: isFront
                  ? 'linear-gradient(135deg, #1f2937, #374151)'
                  : 'linear-gradient(135deg, #111827, #1f2937)',
                border: isFront
                  ? '1px solid rgba(59, 130, 246, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isFront
                  ? '0 20px 40px -10px rgba(0,0,0,0.8), 0 0 25px rgba(1, 81, 134, 0.3)'
                  : '0 10px 20px -5px rgba(0,0,0,0.6)',
                transition: isDragging ? 'none' : 'box-shadow 0.2s ease, border-color 0.2s ease',
              }}
              className="p-4 flex flex-col justify-between cursor-pointer group"
            >
              {/* Card Header & Badge */}
              <div className="flex justify-between items-start gap-1">
                {item.badge ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-sky-950/80 border border-sky-500/30 text-sky-300">
                    {item.badge}
                  </span>
                ) : <span />}
                {isFront && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>

              {/* Photo or Avatar Icon */}
              <div className="flex flex-col items-center justify-center my-2">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow-inner relative">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                      <User size={22} />
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Title & Price */}
              <div className="text-center">
                <h4 className="text-white text-sm font-semibold truncate tracking-tight">
                  {item.title}
                </h4>
                {item.subtitle && (
                  <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                )}
                {item.price !== undefined && (
                  <div className="mt-1 font-mono text-xs font-bold text-sky-400 tabular-nums">
                    {item.price} L
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Drag Hint */}
      <div className="mt-4 text-[11px] font-mono text-slate-500 tracking-wider flex items-center gap-2">
        <span>← DRAG OR CLICK TO ROTATE CARDS →</span>
      </div>
    </div>
  );
};
