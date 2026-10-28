import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Phone,
  Clock,
  AlertCircle,
  Droplets,
  Plus,
} from 'lucide-react';
import { api } from '../services/api';
import { CarSpaBooking, CarSpaCenter } from '../types';

const fmtINR = (n?: number | null) =>
  `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;

const inputCls =
  'w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500';

export const CarSpaDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [center, setCenter] = useState<CarSpaCenter | null>(null);
  const [bookings, setBookings] = useState<CarSpaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slotDrafts, setSlotDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const [svcName, setSvcName] = useState('');
  const [svcPrice, setSvcPrice] = useState('');
  const [svcMins, setSvcMins] = useState('45');
  const [adding, setAdding] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const spa = await api.getMyCarSpa();
      setCenter(spa);
      const incoming = await api.getIncomingCarSpaBookings();
      setBookings(incoming);
    } catch (err: any) {
      if (String(err.message || '').toLowerCase().includes('no car spa')) {
        navigate('/register/car-spa', { replace: true });
        return;
      }
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignSlot = async (bookingId: number) => {
    const local = slotDrafts[bookingId];
    if (!local) {
      setError('Pick a date and time for the slot.');
      return;
    }
    setSavingId(bookingId);
    setError('');
    try {
      const updated = await api.assignCarSpaSlot(bookingId, {
        slot_start: new Date(local).toISOString(),
      });
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    } catch (err: any) {
      setError(err.message || 'Failed to assign slot');
    } finally {
      setSavingId(null);
    }
  };

  const addService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!svcName.trim() || !Number(svcPrice)) return;
    setAdding(true);
    try {
      await api.addCarSpaService({
        name: svcName.trim(),
        price: Number(svcPrice),
        duration_minutes: Number(svcMins) || 45,
      });
      setSvcName('');
      setSvcPrice('');
      setSvcMins('45');
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add service');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-bold text-slate-400 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!center) return null;

  const statusTone =
    center.status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : center.status === 'PENDING_APPROVAL'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-red-50 text-red-700 border-red-200';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/services')} className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Services
          </button>
          <span className="text-xs font-black flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-cyan-600" /> Car Spa Hub
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-5">
        {error && (
          <div className="flex gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-black">{center.name}</h1>
              <p className="text-xs text-slate-500 mt-1">
                {center.address}, {center.city}
              </p>
              {center.phone && (
                <p className="text-xs font-bold text-slate-600 mt-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {center.phone}
                </p>
              )}
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusTone}`}>
              {center.status.replace(/_/g, ' ')}
            </span>
          </div>
          {center.status === 'PENDING_APPROVAL' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Waiting for admin approval. Customers cannot book until your spa is ACTIVE.
            </p>
          )}
          {center.rejection_reason && (
            <p className="text-[11px] text-red-700">Reason: {center.rejection_reason}</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
          <h2 className="text-sm font-black">Your services</h2>
          <div className="space-y-2">
            {(center.services || []).filter((s) => s.is_active).map((s) => (
              <div key={s.id} className="flex justify-between gap-3 text-xs border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
                <div>
                  <p className="font-black">{s.name}</p>
                  <p className="text-[10px] text-slate-400">{s.duration_minutes} min</p>
                </div>
                <p className="font-black text-cyan-700">{fmtINR(s.price)}</p>
              </div>
            ))}
          </div>
          <form onSubmit={addService} className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <input className={inputCls} placeholder="New service" value={svcName} onChange={(e) => setSvcName(e.target.value)} />
            <input className={inputCls} placeholder="Price" type="number" value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} />
            <input className={inputCls} placeholder="Minutes" type="number" value={svcMins} onChange={(e) => setSvcMins(e.target.value)} />
            <button type="submit" disabled={adding} className="px-3 py-2 rounded-xl bg-cyan-600 text-white text-xs font-black flex items-center justify-center gap-1">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-black">Incoming bookings</h2>
          {bookings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center text-xs text-slate-500">
              Paid bookings will appear here so you can assign a visit slot.
            </div>
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-mono font-bold text-slate-400">{b.booking_reference}</p>
                    <p className="text-sm font-black mt-0.5">{b.service_name}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {b.customer?.full_name || 'Customer'}
                      {b.customer?.phone_number ? ` · ${b.customer.phone_number}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Wanted date {b.wanted_date}</p>
                    {b.customer_note && <p className="text-[11px] text-slate-600 mt-1">Note: {b.customer_note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black">{fmtINR(b.amount_paid || b.service_price)}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">{b.status.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                {(b.status === 'PAID_AWAITING_SLOT' || b.status === 'SLOT_ASSIGNED') && (
                  <div className="space-y-2">
                    {b.slot_start && (
                      <p className="text-xs font-bold text-cyan-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Slot {new Date(b.slot_start).toLocaleString()}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="datetime-local"
                        className={inputCls}
                        value={slotDrafts[b.id] || ''}
                        onChange={(e) => setSlotDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => assignSlot(b.id)}
                        disabled={savingId === b.id}
                        className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-black disabled:opacity-60 flex items-center justify-center gap-1"
                      >
                        {savingId === b.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {b.slot_start ? 'Update slot' : 'Assign slot'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400">
          Need a new spa? Only one workshop per partner account in this version.{' '}
          <Link to="/services" className="text-cyan-600 font-bold">
            Back to services
          </Link>
        </p>
      </div>
    </div>
  );
};
