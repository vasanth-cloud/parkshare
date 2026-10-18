import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getFullImageUrl } from '../services/api';
import { DriverAdminSummary, DriverBooking, DriverPricing, DriverProfile } from '../types';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Star,
  Car,
  Phone,
  FileText,
  RotateCcw,
  X,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  BadgeCheck,
  IndianRupee,
  History,
  Sliders,
  Users,
  Loader2,
  Power,
  ExternalLink,
} from 'lucide-react';

type Tab = 'drivers' | 'trips' | 'pricing';
type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'REJECTED';

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

const TRIP_STATUS: Record<string, string> = {
  REQUESTED: 'Searching',
  DRIVER_ACCEPTED: 'Awaiting payment',
  CONFIRMED: 'Paid / confirmed',
  TRIP_STARTED: 'Live',
  PAYMENT_DUE: 'Balance due',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

export const AdminDriversPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('drivers');
  const [summary, setSummary] = useState<DriverAdminSummary | null>(null);

  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<DriverProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [trips, setTrips] = useState<DriverBooking[]>([]);
  const [tripStatus, setTripStatus] = useState('ALL');
  const [loadingTrips, setLoadingTrips] = useState(false);

  const [pricing, setPricing] = useState<DriverPricing | null>(null);
  const [pricingForm, setPricingForm] = useState<Partial<DriverPricing>>({});
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingMsg, setPricingMsg] = useState('');
  const [error, setError] = useState('');

  const loadSummary = () => api.getDriverAdminSummary().then(setSummary).catch(() => {});

  const loadDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const data = await api.getDrivers(statusFilter === 'ALL' ? undefined : statusFilter);
      setDrivers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load drivers');
    } finally {
      setLoadingDrivers(false);
    }
  };

  const loadTrips = async () => {
    setLoadingTrips(true);
    try {
      setTrips(await api.getAdminDriverBookings(tripStatus));
    } catch (err: any) {
      setError(err.message || 'Failed to load trips');
    } finally {
      setLoadingTrips(false);
    }
  };

  const loadPricing = async () => {
    try {
      const p = await api.getDriverPricing();
      setPricing(p);
      setPricingForm(p);
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing');
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [statusFilter]);

  useEffect(() => {
    if (tab === 'trips') loadTrips();
    if (tab === 'pricing' && !pricing) loadPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tripStatus]);

  const updateStatus = async (id: number, status: string, reason?: string) => {
    setActionId(id);
    try {
      await api.updateDriverStatus(id, status, reason);
      setRejecting(null);
      setRejectReason('');
      await Promise.all([loadDrivers(), loadSummary()]);
    } catch (err: any) {
      alert(err.message || 'Failed to update driver');
    } finally {
      setActionId(null);
    }
  };

  const savePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPricing(true);
    setPricingMsg('');
    try {
      const body: Partial<DriverPricing> = {
        hourly_rate: Number(pricingForm.hourly_rate),
        platform_fee_percent: Number(pricingForm.platform_fee_percent),
        tax_percent: Number(pricingForm.tax_percent),
        min_billable_hours: Number(pricingForm.min_billable_hours),
        night_surcharge_percent: Number(pricingForm.night_surcharge_percent),
        night_start_hour: Number(pricingForm.night_start_hour),
        night_end_hour: Number(pricingForm.night_end_hour),
        outstation_hourly_rate: Number(pricingForm.outstation_hourly_rate),
        outstation_min_hours: Number(pricingForm.outstation_min_hours),
        billing_increment_minutes: Number(pricingForm.billing_increment_minutes),
        car_type_multipliers: pricingForm.car_type_multipliers,
      };
      const p = await api.updateDriverPricing(body);
      setPricing(p);
      setPricingForm(p);
      setPricingMsg('Pricing published. New estimates use these rates immediately.');
    } catch (err: any) {
      setError(err.message || 'Failed to save pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  const filtered = drivers.filter((d) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      d.full_name.toLowerCase().includes(q) ||
      d.phone.toLowerCase().includes(q) ||
      d.city.toLowerCase().includes(q) ||
      d.dl_number.toLowerCase().includes(q) ||
      d.aadhaar_number_masked.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Services</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Acting Drivers Operations</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Approve KYC, set hourly rates & platform fee, and audit every chauffeur trip.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <Link
            to="/disputes?service=drivers"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition text-xs font-bold flex items-center space-x-1.5"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Driver Disputes</span>
          </Link>
          <button
            onClick={() => {
              loadSummary();
              if (tab === 'drivers') loadDrivers();
              if (tab === 'trips') loadTrips();
              if (tab === 'pricing') loadPricing();
            }}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition text-xs font-bold flex items-center space-x-1"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-950/50 border border-rose-800 text-rose-200 text-xs font-bold px-3.5 py-2.5 rounded-xl">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Metric label="Drivers" value={String(summary.total_drivers)} sub={`${summary.pending_drivers} pending`} />
          <Metric label="Active / online" value={`${summary.active_drivers}`} sub={`${summary.online_drivers} online`} accent="emerald" />
          <Metric label="Open requests" value={String(summary.open_requests)} accent="amber" />
          <Metric label="Live trips" value={String(summary.live_trips)} accent="cyan" />
          <Metric label="Gross collected" value={fmtINR(summary.gross_collected)} accent="indigo" />
          <Metric label="Platform fee" value={fmtINR(summary.platform_commission)} sub={`payouts ${fmtINR(summary.driver_payouts)}`} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
        {(
          [
            { id: 'drivers', label: 'Drivers', icon: Users },
            { id: 'trips', label: 'Trip history', icon: History },
            { id: 'pricing', label: 'Pricing', icon: Sliders },
          ] as { id: Tab; label: string; icon: any }[]
        ).map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black ${
                on ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'drivers' && (
        <>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl text-xs font-bold border border-slate-800 overflow-x-auto">
              {(['ALL', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                    statusFilter === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s === 'PENDING_APPROVAL' ? 'Pending' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="relative flex-1 md:max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, city, DL, Aadhaar…"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {loadingDrivers ? (
            <div className="text-center py-16 text-slate-500 text-xs font-semibold">Loading chauffeur directory…</div>
          ) : filtered.length === 0 ? (
            <Empty title="No acting drivers found" body={searchQuery ? `No drivers match “${searchQuery}”.` : 'Partners register from the host app. New applications appear here for KYC review.'} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((d) => (
                <DriverCard
                  key={d.id}
                  d={d}
                  busy={actionId === d.id}
                  onApprove={() => updateStatus(d.id, 'ACTIVE')}
                  onSuspend={() => updateStatus(d.id, 'SUSPENDED', 'Temporarily paused by admin')}
                  onReject={() => {
                    setRejecting(d);
                    setRejectReason('');
                  }}
                  onReactivate={() => updateStatus(d.id, 'ACTIVE')}
                  onPreview={setPreviewUrl}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'trips' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit text-xs font-bold">
            {['ALL', 'REQUESTED', 'CONFIRMED', 'TRIP_STARTED', 'PAYMENT_DUE', 'COMPLETED', 'CANCELLED'].map((s) => (
              <button
                key={s}
                onClick={() => setTripStatus(s)}
                className={`px-3 py-1.5 rounded-lg ${tripStatus === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {s === 'ALL' ? 'All' : TRIP_STATUS[s] || s}
              </button>
            ))}
          </div>
          {loadingTrips ? (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading trips…
            </p>
          ) : trips.length === 0 ? (
            <Empty title="No trips yet" body="Acting-driver bookings will list here with fare, OTPs and payout status." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    {['Ref', 'Status', 'City', 'Schedule', 'Car', 'Customer', 'Driver', 'Fare', 'Paid', 'Payout'].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trips.map((b) => (
                    <tr key={b.id} className="border-t border-slate-800 bg-slate-950/40">
                      <td className="px-3 py-2.5 font-mono font-black text-indigo-300">{b.booking_reference}</td>
                      <td className="px-3 py-2.5">{TRIP_STATUS[b.status] || b.status}</td>
                      <td className="px-3 py-2.5">{b.pickup_city}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {fmtDT(b.start_time)}
                        <div className="text-slate-500">{b.estimated_hours} hrs</div>
                      </td>
                      <td className="px-3 py-2.5">
                        {b.car_type} · {b.transmission}
                        <div className="text-slate-500">{b.seater}-seater</div>
                      </td>
                      <td className="px-3 py-2.5">{b.customer?.full_name || `#${b.customer_id}`}</td>
                      <td className="px-3 py-2.5">{b.driver?.display_name || '—'}</td>
                      <td className="px-3 py-2.5 font-bold">{fmtINR(b.final_total ?? b.estimated_total)}</td>
                      <td className="px-3 py-2.5">{fmtINR(b.amount_paid)}</td>
                      <td className="px-3 py-2.5 text-emerald-400">{fmtINR(b.driver_earning)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'pricing' && pricingForm && (
        <form onSubmit={savePricing} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 max-w-3xl">
          <div>
            <h2 className="text-sm font-black flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-indigo-400" /> Platform-controlled chauffeur pricing
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Drivers cannot set rates. These numbers power the customer estimate, the advance payment, and overtime settlement.
            </p>
          </div>
          {pricingMsg && <p className="text-xs font-bold text-emerald-400">{pricingMsg}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Num label="Hourly rate ₹" value={pricingForm.hourly_rate} onChange={(v) => setPricingForm({ ...pricingForm, hourly_rate: v })} />
            <Num label="Platform fee %" value={pricingForm.platform_fee_percent} onChange={(v) => setPricingForm({ ...pricingForm, platform_fee_percent: v })} />
            <Num label="GST %" value={pricingForm.tax_percent} onChange={(v) => setPricingForm({ ...pricingForm, tax_percent: v })} />
            <Num label="Min billable hours" value={pricingForm.min_billable_hours} onChange={(v) => setPricingForm({ ...pricingForm, min_billable_hours: v })} />
            <Num label="Billing increment (min)" value={pricingForm.billing_increment_minutes} onChange={(v) => setPricingForm({ ...pricingForm, billing_increment_minutes: v })} />
            <Num label="Night surcharge %" value={pricingForm.night_surcharge_percent} onChange={(v) => setPricingForm({ ...pricingForm, night_surcharge_percent: v })} />
            <Num label="Night starts (hour)" value={pricingForm.night_start_hour} onChange={(v) => setPricingForm({ ...pricingForm, night_start_hour: v })} />
            <Num label="Night ends (hour)" value={pricingForm.night_end_hour} onChange={(v) => setPricingForm({ ...pricingForm, night_end_hour: v })} />
            <Num label="Outstation ₹/hr" value={pricingForm.outstation_hourly_rate} onChange={(v) => setPricingForm({ ...pricingForm, outstation_hourly_rate: v })} />
            <Num label="Outstation min hours" value={pricingForm.outstation_min_hours} onChange={(v) => setPricingForm({ ...pricingForm, outstation_min_hours: v })} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 mb-2">Car type multipliers</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(pricingForm.car_type_multipliers || {}).map(([k, v]) => (
                <label key={k} className="text-[11px] space-y-1">
                  <span className="text-slate-400 font-bold">{k}</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    value={v}
                    onChange={(e) =>
                      setPricingForm({
                        ...pricingForm,
                        car_type_multipliers: { ...(pricingForm.car_type_multipliers || {}), [k]: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPricing}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-5 py-3 rounded-xl disabled:opacity-60"
          >
            {savingPricing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save pricing
          </button>
        </form>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-black">Reject {rejecting.full_name}?</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason shown to the driver"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
            />
            <div className="flex gap-2">
              <button onClick={() => setRejecting(null)} className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-bold">
                Cancel
              </button>
              <button
                onClick={() => updateStatus(rejecting.id, 'REJECTED', rejectReason || 'Rejected by admin')}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-black"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="document" className="max-h-[85vh] max-w-full rounded-2xl border border-slate-700" />
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; sub?: string; accent?: string }> = ({ label, value, sub, accent }) => {
  const color =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'amber'
      ? 'text-amber-400'
      : accent === 'cyan'
      ? 'text-cyan-400'
      : accent === 'indigo'
      ? 'text-indigo-300'
      : 'text-white';
  return (
    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</span>
      <div className={`text-xl font-black ${color}`}>{value}</div>
      {sub && <span className="text-[10px] text-slate-500 font-medium">{sub}</span>}
    </div>
  );
};

const Empty: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="bg-slate-900 rounded-3xl p-10 text-center border border-slate-800 space-y-3">
    <h3 className="text-base font-bold text-white">{title}</h3>
    <p className="text-xs text-slate-400 max-w-sm mx-auto">{body}</p>
  </div>
);

const Num: React.FC<{ label: string; value?: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <label className="text-[11px] space-y-1 block">
    <span className="text-slate-400 font-bold">{label}</span>
    <input
      type="number"
      step="any"
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold"
    />
  </label>
);

const DriverCard: React.FC<{
  d: DriverProfile;
  busy: boolean;
  onApprove: () => void;
  onSuspend: () => void;
  onReject: () => void;
  onReactivate: () => void;
  onPreview: (url: string) => void;
}> = ({ d, busy, onApprove, onSuspend, onReject, onReactivate, onPreview }) => {
  const isActive = d.status === 'ACTIVE';
  const isPending = d.status === 'PENDING_APPROVAL';
  const isSuspended = d.status === 'SUSPENDED';
  const isRejected = d.status === 'REJECTED';
  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 hover:border-indigo-500/50 transition-all p-5 space-y-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <img
            src={getFullImageUrl(d.photo_url || '') || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
            alt={d.full_name}
            className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/30"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white truncate">{d.full_name}</h3>
            <p className="text-[10px] text-indigo-400 font-bold">
              {d.city}
              {d.service_area ? ` · ${d.service_area}` : ''}
            </p>
          </div>
        </div>
        {isActive && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <span className={`w-1.5 h-1.5 rounded-full ${d.is_available ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {d.is_available ? 'Online' : 'Offline'}
          </span>
        )}
        {isPending && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
            <Clock className="w-3 h-3" /> Review
          </span>
        )}
        {isSuspended && (
          <span className="text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-full">Suspended</span>
        )}
        {isRejected && (
          <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">Rejected</span>
        )}
      </div>

      <div className="bg-slate-950/70 p-3 rounded-2xl space-y-1.5 text-xs border border-slate-800/80">
        <Row icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={d.phone} />
        <Row icon={<FileText className="w-3.5 h-3.5" />} label="DL" value={d.dl_number} extra={d.dl_verified ? 'verified' : ''} />
        <Row icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Aadhaar" value={d.aadhaar_number_masked} extra={d.aadhaar_verified ? 'verified' : ''} />
        <Row icon={<Star className="w-3.5 h-3.5" />} label="Rating" value={`${d.rating.toFixed(1)} · ${d.total_trips} trips · ${fmtINR(d.total_earnings)}`} />
        <Row icon={<Car className="w-3.5 h-3.5" />} label="Skills" value={`${d.transmissions.join(', ')} · ${d.vehicle_categories.join(', ')}`} />
        {d.kyc_provider && (
          <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-1">
            <BadgeCheck className="w-3 h-3 text-emerald-400" /> {d.kyc_provider}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {d.dl_document_url && (
          <DocBtn
            label="Licence"
            url={d.dl_document_url}
            onPreview={onPreview}
          />
        )}
        {d.aadhaar_document_url && (
          <DocBtn
            label="Aadhaar"
            url={d.aadhaar_document_url}
            onPreview={onPreview}
          />
        )}
      </div>

      {d.rejection_reason && (
        <p className="text-[11px] text-rose-300">Reason: {d.rejection_reason}</p>
      )}

      <div className="pt-3 border-t border-slate-800 flex items-center gap-2 mt-auto">
        {(isPending || isRejected) && (
          <button
            disabled={busy}
            onClick={onApprove}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Approve
          </button>
        )}
        {isPending && (
          <button disabled={busy} onClick={onReject} className="px-3 py-2 rounded-xl bg-slate-800 text-rose-300 text-xs font-bold">
            Reject
          </button>
        )}
        {isActive && (
          <button
            disabled={busy}
            onClick={onSuspend}
            className="flex-1 bg-slate-800 hover:bg-rose-950/60 text-slate-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-700"
          >
            <XCircle className="w-3.5 h-3.5" /> Suspend
          </button>
        )}
        {isSuspended && (
          <button
            disabled={busy}
            onClick={onReactivate}
            className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"
          >
            <Power className="w-3.5 h-3.5" /> Reactivate
          </button>
        )}
      </div>
    </div>
  );
};

const Row: React.FC<{ icon: React.ReactNode; label: string; value: string; extra?: string }> = ({ icon, label, value, extra }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-slate-400 flex items-center gap-1.5">
      {icon} {label}
    </span>
    <span className="font-bold text-slate-200 text-right truncate">
      {value}
      {extra && <span className="ml-1 text-emerald-400 text-[10px]">{extra}</span>}
    </span>
  </div>
);

const DocBtn: React.FC<{ label: string; url: string; onPreview: (u: string) => void }> = ({ label, url, onPreview }) => {
  const full = getFullImageUrl(url);
  const isPdf = url.toLowerCase().endsWith('.pdf');
  return (
    <button
      type="button"
      onClick={() => (isPdf ? window.open(full, '_blank') : onPreview(full))}
      className="flex-1 py-2 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-bold text-indigo-300 flex items-center justify-center gap-1"
    >
      <ExternalLink className="w-3 h-3" /> {label}
    </button>
  );
};
