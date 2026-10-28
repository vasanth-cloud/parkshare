import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

interface LiveRentalTimerProps {
  status: string;
  tripStartedAt?: string | null;
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
  className = '',
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (status !== 'IN_PROGRESS' && status !== 'ACTIVE_TRIP' || !tripStartedAt) {
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

  if ((status === 'IN_PROGRESS' || status === 'ACTIVE_TRIP') && tripStartedAt) {
    return (
      <div className={`p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-500/40 text-center space-y-1 ${className}`}>
        <div className="flex items-center justify-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Live Active Rental</span>
        </div>
        <div className="text-2xl font-black font-mono tracking-wider text-emerald-700 dark:text-emerald-300">
          ⏱️ {formatElapsed(elapsedSeconds)}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-center text-xs text-amber-700 dark:text-amber-400 font-medium ${className}`}>
      Awaiting Renter Handover OTP
    </div>
  );
};

