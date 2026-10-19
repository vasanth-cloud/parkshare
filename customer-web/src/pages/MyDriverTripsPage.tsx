import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DriverBooking } from '../types';
import { ArrowLeft, Car, Clock, MapPin, Loader2, ChevronRight, Sparkles } from 'lucide-react';

const fmtINR = (n?: number | null) =>
  `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDT = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

const STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: 'Searching', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  DRIVER_ACCEPTED: { label: 'Pay to unlock', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  TRIP_STARTED: { label: 'In progress', cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' },
  PAYMENT_DUE: { label: 'Balance due', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  COMPLETED: { label: 'Completed', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  EXPIRED: { label: 'Expired', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

export const MyDriverTripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<DriverBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    api
      .getMyDriverBookings()
      .then(setTrips)
      .catch((err) => setError(err.message || 'Failed to load trips'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = window.setInterval(load, 8000);
    return () => window.clearInterval(t);
  }, []);

  const open = trips.filter((t) => !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(t.status));
  const past = trips.filter((t) => ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(t.status));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs font-black">Acting driver trips</span>
          <Link to="/services/drivers" className="text-[11px] font-black text-indigo-600">
            + Book
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {loading && (
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        )}
        {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

        <section className="space-y-2">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Active</h2>
          {open.length === 0 && !loading ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center space-y-2">
              <Sparkles className="w-6 h-6 mx-auto text-indigo-400" />
              <p className="text-xs font-black">No active chauffeur trips</p>
              <Link to="/services/drivers" className="inline-block text-[11px] font-bold text-indigo-600">
                Book an acting driver
              </Link>
            </div>
          ) : (
            open.map((b) => <TripRow key={b.id} b={b} />)
          )}
        </section>

        {past.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400">History</h2>
            {past.map((b) => (
              <TripRow key={b.id} b={b} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

const TripRow: React.FC<{ b: DriverBooking }> = ({ b }) => {
  const meta = STATUS[b.status] || { label: b.status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <Link
      to={`/drivers/trips/${b.id}`}
      className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-2 hover:border-indigo-400 transition"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-black text-slate-400">{b.booking_reference}</span>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
      </div>
      <p className="text-xs font-black flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-indigo-500" /> {b.pickup_address}
      </p>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {fmtDT(b.start_time)}
        </span>
        <span className="flex items-center gap-1">
          <Car className="w-3 h-3" /> {b.car_type} · {b.transmission}
        </span>
        <span className="font-black text-slate-800 dark:text-white flex items-center gap-1">
          {fmtINR(b.final_total ?? b.estimated_total)}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
};
