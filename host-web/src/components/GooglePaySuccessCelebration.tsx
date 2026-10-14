import React, { useEffect, useState } from 'react';
import { ShieldCheck, Check, Sparkles } from 'lucide-react';

export interface CelebrationData {
  title: string;
  subtitle?: string;
  reference?: string;
  spot?: string;
  bay?: string;
  amount?: number | string;
}

interface Props {
  data: CelebrationData | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

// Google Pay / PhonePe celebratory 4-note chime synthesized via Web Audio API
export const playGooglePayChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Upbeat celebratory arpeggio: E5 -> G#5 -> B5 -> E6
    const notes = [
      { freq: 659.25, time: 0.0, duration: 0.16 }, // E5
      { freq: 830.61, time: 0.11, duration: 0.16 }, // G#5
      { freq: 987.77, time: 0.22, duration: 0.2 },  // B5
      { freq: 1318.51, time: 0.35, duration: 0.55 }, // E6
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.3, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60, 40, 80]);
    }
  } catch {
    // Audio policy fallback
  }
};

const CONFETTI_COLORS = [
  '#10B981',
  '#3B82F6',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
  '#F97316',
  '#14B8A6',
];

export const GooglePaySuccessCelebration: React.FC<Props> = ({
  data,
  onDismiss,
  autoDismissMs = 3200,
}) => {
  const [confetti] = useState(() =>
    Array.from({ length: 32 }).map((_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: Math.random() * 8 + 6,
      dx: (Math.random() - 0.5) * 360,
      dy: (Math.random() - 0.5) * 360 - 40,
      rot: (Math.random() - 0.5) * 720,
      shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'strip' : 'square',
      delay: Math.random() * 0.15,
      duration: Math.random() * 0.6 + 0.7,
    }))
  );

  useEffect(() => {
    if (!data) return;

    playGooglePayChime();

    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [data, autoDismissMs, onDismiss]);

  if (!data) return null;

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
    >
      <style>{`
        @keyframes gpay-spring {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          85% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes gpay-ripple {
          0% { transform: scale(0.7); opacity: 0.9; }
          100% { transform: scale(1.65); opacity: 0; }
        }
        @keyframes gpay-dash {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes confetti-burst {
          0% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx), var(--dy)) scale(0.3) rotate(var(--rot));
            opacity: 0;
          }
        }
      `}</style>

      {/* Confetti Explosion Particles */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {confetti.map((c) => (
          <div
            key={c.id}
            style={
              {
                '--dx': `${c.dx}px`,
                '--dy': `${c.dy}px`,
                '--rot': `${c.rot}deg`,
                backgroundColor: c.color,
                width: c.shape === 'strip' ? `${c.size * 1.8}px` : `${c.size}px`,
                height: c.shape === 'strip' ? `${c.size * 0.4}px` : `${c.size}px`,
                borderRadius: c.shape === 'circle' ? '9999px' : '2px',
                animation: `confetti-burst ${c.duration}s cubic-bezier(0.25, 1, 0.5, 1) ${c.delay}s forwards`,
              } as React.CSSProperties
            }
            className="absolute"
          />
        ))}
      </div>

      {/* Main Celebration Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-sm w-full bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 border border-emerald-500/30 shadow-2xl text-center space-y-5 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="absolute -top-16 inset-x-0 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-center my-3">
          <div
            style={{ animation: 'gpay-ripple 1.6s cubic-bezier(0, 0.2, 0.8, 1) infinite' }}
            className="absolute w-28 h-28 rounded-full border-2 border-emerald-400/40 pointer-events-none"
          />
          <div
            style={{ animation: 'gpay-ripple 1.6s cubic-bezier(0, 0.2, 0.8, 1) 0.5s infinite' }}
            className="absolute w-28 h-28 rounded-full border border-emerald-400/30 pointer-events-none"
          />

          <div
            style={{ animation: 'gpay-spring 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
            className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 border-4 border-emerald-400/40"
          >
            <svg className="w-10 h-10 sm:w-11 sm:h-11" viewBox="0 0 48 48" fill="none">
              <path
                d="M13 25 L21 33 L35 17"
                stroke="white"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 48,
                  strokeDashoffset: 48,
                  animation: 'gpay-dash 0.4s 0.25s ease-out forwards',
                }}
              />
            </svg>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-3 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3 text-emerald-300" />
            <span>Success</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {data.title}
          </h2>

          <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
            {data.subtitle || 'Vehicle verified & parking session is now officially active.'}
          </p>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Session ID / Reference:</span>
            <span className="font-mono font-bold text-white">
              #{data.reference || 'SESSION-ACTIVE'}
            </span>
          </div>

          {data.spot && (
            <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1.5 border-t border-slate-800">
              <span>Location:</span>
              <span className="font-bold text-emerald-300 truncate max-w-[160px]">
                {data.spot}
              </span>
            </div>
          )}

          {data.bay && (
            <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1.5 border-t border-slate-800">
              <span>Parking Slot:</span>
              <span className="font-extrabold text-white">
                Slot {data.bay}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-slate-950 font-black py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center space-x-1.5"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Continue to Session</span>
        </button>
      </div>
    </div>
  );
};
