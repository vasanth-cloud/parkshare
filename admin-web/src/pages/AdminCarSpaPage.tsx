import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { CarSpaBooking, CarSpaCenter } from '../types';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Droplets,
  Loader2,
  Phone,
  MapPin,
  AlertTriangle,
} from 'lucide-react';

const fmtINR = (n?: number | null) =>
  `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;

export const AdminCarSpaPage: React.FC = () => {
  const [tab, setTab] = useState<'centers' | 'bookings'>('centers');
  const [spas, setSpas] = useState<CarSpaCenter[]>([]);
  const [bookings, setBookings] = useState<CarSpaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const fetchSpas = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getCarSpas(statusFilter === 'ALL' ? undefined : statusFilter);
      setSpas(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load car spas');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      setBookings(await api.getCarSpaBookings());
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'centers') fetchSpas();
    else fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return spas;
    return spas.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q)
    );
  }, [spas, searchQuery]);

  const updateStatus = async (spaId: number, status: string) => {
    let reason: string | undefined;
    if (status === 'REJECTED' || status === 'SUSPENDED') {
      reason = window.prompt(`Reason for ${status.toLowerCase()} (optional):`) || undefined;
    }
    setActionId(spaId);
    try {
      await api.updateCarSpaStatus(spaId, status, reason);
      await fetchSpas();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <Link to="/services" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Services
          </Link>
          <span className="text-xs font-black flex items-center gap-1 text-cyan-300">
            <Droplets className="w-3.5 h-3.5" /> Car Spa Console
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-black">Car Spa & Detailing</h1>
          <p className="text-xs text-slate-400 mt-1">Approve workshops, review priced services, and monitor paid bookings.</p>
        </div>

        <div className="flex gap-2">
          {(['centers', 'bookings'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border ${
                tab === t ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {t === 'centers' ? 'Centers' : 'Bookings'}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-800 rounded-xl px-3 py-2 flex gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {tab === 'centers' && (
          <>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, city, phone…"
                  className="w-full bg-transparent text-xs font-semibold focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING_APPROVAL">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {loading ? (
              <div className="py-16 flex justify-center text-xs font-bold text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-xs text-slate-400">
                No car spas match this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((spa) => (
                  <div key={spa.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black">{spa.name}</h3>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-700 text-slate-300">
                            {spa.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {spa.address}, {spa.city}
                        </p>
                        {spa.phone && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> {spa.phone}
                          </p>
                        )}
                        {spa.rejection_reason && (
                          <p className="text-[11px] text-red-400 mt-1">Reason: {spa.rejection_reason}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {spa.status !== 'ACTIVE' && (
                          <button
                            type="button"
                            disabled={actionId === spa.id}
                            onClick={() => updateStatus(spa.id, 'ACTIVE')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                        {spa.status !== 'SUSPENDED' && spa.status === 'ACTIVE' && (
                          <button
                            type="button"
                            disabled={actionId === spa.id}
                            onClick={() => updateStatus(spa.id, 'SUSPENDED')}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-[11px] font-black flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" /> Suspend
                          </button>
                        )}
                        {spa.status !== 'REJECTED' && spa.status !== 'ACTIVE' && (
                          <button
                            type="button"
                            disabled={actionId === spa.id}
                            onClick={() => updateStatus(spa.id, 'REJECTED')}
                            className="px-3 py-1.5 rounded-xl bg-red-700 text-white text-[11px] font-black flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(spa.services || []).filter((s) => s.is_active).map((s) => (
                        <span key={s.id} className="text-[10px] font-bold bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-slate-300">
                          {s.name} · {fmtINR(s.price)} · {s.duration_minutes}m
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'bookings' && (
          loading ? (
            <div className="py-16 flex justify-center text-xs font-bold text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-xs text-slate-400">
              No car spa bookings yet.
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-mono text-[10px] text-slate-500">{b.booking_reference}</p>
                    <p className="font-black mt-0.5">{b.service_name} · {b.spa_name}</p>
                    <p className="text-slate-400 mt-1">
                      {b.customer?.full_name || 'Customer'}
                      {b.customer?.phone_number ? ` · ${b.customer.phone_number}` : ''}
                    </p>
                    <p className="text-slate-500 mt-1">
                      Wanted {b.wanted_date}
                      {b.slot_start ? ` · Slot ${new Date(b.slot_start).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black">{fmtINR(b.amount_paid || b.service_price)}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{b.status.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
