import React, { useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { AudioEngine } from '../AudioEngine';

interface UrgencyCountdownTimerProps {
  seconds: number;
  maxSeconds?: number;
  isActive: boolean;
  onTimeout?: () => void;
  size?: 'normal' | 'large';
}

export const UrgencyCountdownTimer: React.FC<UrgencyCountdownTimerProps> = ({
  seconds,
  maxSeconds = 15,
  isActive,
  size = 'normal',
}) => {
  const isUrgent = seconds <= 5 && seconds > 0 && isActive;
  const isLastCall = seconds <= 3 && seconds > 0 && isActive;

  // Sound tick in last 3 seconds
  useEffect(() => {
    if (isLastCall) {
      AudioEngine.playTimerTick();
    }
  }, [seconds, isLastCall]);

  const percent = Math.max(0, Math.min(100, (seconds / maxSeconds) * 100));

  return (
    <div className="flex flex-col items-center select-none">
      {/* Circular or pill telemetry timer */}
      <div className="relative flex items-center justify-center">
        {/* Heartbeat pulse ring when urgent */}
        {isUrgent && (
          <div
            className={`absolute inset-0 rounded-full animate-ping pointer-events-none ${
              isLastCall ? 'bg-rose-500/30' : 'bg-amber-500/20'
            }`}
          />
        )}

        <div
          style={{
            background: isLastCall
              ? 'linear-gradient(135deg, #450a0a, #1f2937)'
              : isUrgent
              ? 'linear-gradient(135deg, #3d2a05, #1f2937)'
              : 'linear-gradient(135deg, #111827, #1f2937)',
            border: isLastCall
              ? '1px solid rgba(239, 68, 68, 0.6)'
              : isUrgent
              ? '1px solid rgba(194, 163, 101, 0.5)'
              : '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            boxShadow: isLastCall
              ? '0 0 30px rgba(239, 68, 68, 0.35)'
              : isUrgent
              ? '0 0 25px rgba(194, 163, 101, 0.25)'
              : '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
          className={`transition-all duration-300 flex flex-col items-center justify-center ${
            size === 'large' ? 'p-6 px-10' : 'p-3 px-6'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            {isLastCall ? (
              <AlertTriangle size={14} className="text-rose-400 animate-bounce" />
            ) : (
              <Clock size={14} className={isUrgent ? 'text-amber-400' : 'text-sky-400'} />
            )}
            <span
              className={`text-[11px] font-mono uppercase tracking-widest font-bold ${
                isLastCall
                  ? 'text-rose-400 animate-pulse'
                  : isUrgent
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              {isLastCall ? 'LAST CALL!' : isActive ? 'CLOCK RUNNING' : 'CLOCK PAUSED'}
            </span>
          </div>

          <div
            className={`font-mono font-black tabular-nums tracking-tight leading-none ${
              size === 'large' ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl'
            } ${
              isLastCall
                ? 'text-rose-400'
                : isUrgent
                ? 'text-amber-400'
                : 'text-white'
            }`}
          >
            {seconds}
            <span className="text-xs font-sans text-slate-400 ml-1 font-semibold">SEC</span>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full h-1.5 bg-slate-950 rounded-full mt-3 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isLastCall
                  ? 'bg-rose-500'
                  : isUrgent
                  ? 'bg-amber-400'
                  : 'bg-sky-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
