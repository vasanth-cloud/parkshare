import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, ShieldCheck } from 'lucide-react';

interface LiveRentalTimerProps {
  status: string;
  tripStartedAt?: string | null;
  pickupTime?: string;
  className?: string;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const LiveRentalTimer: React.FC<LiveRentalTimerProps> = ({
  status,
  tripStartedAt,
  pickupTime,
  className = '',
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (status !== 'IN_PROGRESS' || !tripStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const startMs = new Date(tripStartedAt).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [status, tripStartedAt]);

  if (status === 'IN_PROGRESS' && tripStartedAt) {
    return (
      <div className={`p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-500 text-center space-y-2 shadow-xs ${className}`}>
        <div className="flex items-center justify-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs uppercase tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Rental Trip Active</span>
        </div>

        <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-emerald-700 dark:text-emerald-300 py-0.5">
          ⏱️ {formatElapsed(elapsedSeconds)}
        </div>

        <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Key Handover Verified • Started at {new Date(tripStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>
    );
  }

  // Pending OTP verification / not yet started
  return (
    <div className={`p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/50 border border-amber-500/40 text-center space-y-1.5 ${className}`}>
      <div className="flex items-center justify-center gap-1.5 text-amber-800 dark:text-amber-400 font-bold text-xs">
        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
        <span>Trip Not Started Yet</span>
      </div>
      <p className="text-[11px] text-slate-600 dark:text-slate-400">
        Show the 4-digit OTP to the host upon reaching the hub. Once the host verifies the OTP, your rental trip will begin and the live timer will start.
      </p>
    </div>
  );
};

