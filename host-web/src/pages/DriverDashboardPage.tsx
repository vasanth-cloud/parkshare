import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getFullImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DriverBooking, DriverEarnings, DriverProfile } from '../types';
import {
  ArrowLeft,
  Power,
  Star,
  Wallet,
  Inbox,
  Route,
  History,
  Clock,
  MapPin,
  Car,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  PhoneCall,
  Timer,
  BadgeCheck,
  ShieldAlert,
  Hourglass,
  X,
  Navigation,
  IndianRupee,
  Moon,
} from 'lucide-react';

type Tab = 'requests' | 'trips' | 'history';

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

const fmtDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const s = Math.floor((mins * 60) % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: 'New request', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  DRIVER_ACCEPTED: { label: 'Awaiting customer payment', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  CONFIRMED: { label: 'Confirmed · ready to start', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  TRIP_STARTED: { label: 'Trip in progress', cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' },
  PAYMENT_DUE: { label: 'Overtime balance pending', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  EXPIRED: { label: 'Expired', cls: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300' },
};

export const DriverDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [earnings, setEarnings] = useState<DriverEarnings | null>(null);
  const [requests, setRequests] = useState<DriverBooking[]>([]);
  const [trips, setTrips] = useState<DriverBooking[]>([]);
  const [tab, setTab] = useState<Tab>('requests');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [togglingAvail, setTogglingAvail] = useState(false);

  const [otpModal, setOtpModal] = useState<{ booking: DriverBooking; mode: 'start' | 'end' } | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);

  const [tick, setTick] = useState(0);
  const prevRequestIds = useRef<Set<number>>(new Set());

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  };

  const loadAll = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const p = await api.getMyDriverProfile();
        if (!p) {
          navigate('/register/driver', { replace: true });
          return;
        }
        setProfile(p);
        const [e, r, t] = await Promise.all([
          api.getDriverEarnings(),
          p.status === 'ACTIVE' ? api.getDriverOpenRequests() : Promise.resolve([] as DriverBooking[]),
          api.getDriverTrips(),
        ]);
        setEarnings(e);
        setTrips(t);
        // Notify about brand-new requests
        const newOnes = r.filter((x) => !prevRequestIds.current.has(x.id));
        if (prevRequestIds.current.size > 0 && newOnes.length > 0 && p.is_available) {
          showToast(`${newOnes.length} new trip request${newOnes.length > 1 ? 's' : ''} in ${p.city}`);
        }
        prevRequestIds.current = new Set(r.map((x) => x.id));
        setRequests(r);
        setError('');
      } catch (err: any) {
        if (!silent) setError(err.message || 'Failed to load driver dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    loadAll();
  }, [user, isLoading, loadAll, navigate]);

  // Poll for new requests / status changes
  useEffect(() => {
    if (!profile) return;
    const id = window.setInterval(() => loadAll(true), 5000);
    return () => window.clearInterval(id);
  }, [profile, loadAll]);

  // 1-second ticker for the live meter
  const hasLive = trips.some((t) => t.status === 'TRIP_STARTED');
  useEffect(() => {
    if (!hasLive) return;
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasLive]);

  const activeTrips = useMemo(
    () => trips.filter((t) => ['DRIVER_ACCEPTED', 'CONFIRMED', 'TRIP_STARTED', 'PAYMENT_DUE'].includes(t.status)),
    [trips]
  );
  const historyTrips = useMemo(
    () => trips.filter((t) => ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(t.status)),
    [trips]
  );

  const toggleAvailability = async () => {
    if (!profile || profile.status !== 'ACTIVE') return;
    setTogglingAvail(true);
    try {
      const p = await api.setDriverAvailability(!profile.is_available);
      setProfile(p);
      showToast(p.is_available ? 'You are online — new requests will appear here' : 'You are offline');
    } catch (err: any) {
      setError(err.message || 'Failed to update availability');
    } finally {
      setTogglingAvail(false);
    }
  };

  const accept = async (b: DriverBooking) => {
    setBusyId(b.id);
    setError('');
    try {
      await api.acceptDriverRequest(b.id);
      showToast('Trip accepted. The customer has been notified to pay.');
      await loadAll(true);
      setTab('trips');
    } catch (err: any) {
      setError(err.message || 'Could not accept this request');
      await loadAll(true);
    } finally {
      setBusyId(null);
    }
  };

  const release = async (b: DriverBooking) => {
    if (!window.confirm('Release this trip back to other drivers?')) return;
    setBusyId(b.id);
    try {
      await api.releaseDriverRequest(b.id, 'Released by driver');
      showToast('Trip released');
      await loadAll(true);
    } catch (err: any) {
      setError(err.message || 'Could not release trip');
    } finally {
      setBusyId(null);
    }
  };

  const submitOtp = async () => {
    if (!otpModal) return;
    if (!/^\d{4,6}$/.test(otp)) {
      setOtpError('Enter the 4-digit OTP shown on the customer\'s app.');
      return;
    }
    setOtpBusy(true);
    setOtpError('');
    try {
      const updated =
        otpModal.mode === 'start'
          ? await api.startDriverTrip(otpModal.booking.id, otp)
          : await api.endDriverTrip(otpModal.booking.id, otp);
      setOtpModal(null);
      setOtp('');
      if (otpModal.mode === 'start') {
        showToast('Trip started — the meter is running. Drive safe!');
      } else if (updated.status === 'PAYMENT_DUE') {
        showToast(`Trip ended. Customer owes ${fmtINR(updated.balance_due)} overtime balance.`);
      } else {
        showToast(`Trip completed. ${fmtINR(updated.driver_earning)} credited to your earnings.`);
      }
      await loadAll(true);
    } catch (err: any) {
      setOtpError(err.message || 'OTP verification failed');
    } finally {
      setOtpBusy(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading driver dashboard…
      </div>
    );
  }
  if (!profile) return null;

  const statusBanner = (() => {
    switch (profile.status) {
      case 'PENDING_APPROVAL':
        return {
          icon: <Hourglass className="w-4 h-4" />,
          cls: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200',
          title: 'Documents verified · awaiting admin approval',
          body: 'Your driving licence passed automated KYC. You can go online and accept trips as soon as the ParkCo team approves your profile (usually within 24 hours).',
        };
      case 'SUSPENDED':
        return {
          icon: <ShieldAlert className="w-4 h-4" />,
          cls: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200',
          title: 'Your driver account is suspended',
          body: profile.rejection_reason || 'Please contact ParkCo support for details.',
        };
      case 'REJECTED':
        return {
          icon: <ShieldAlert className="w-4 h-4" />,
          cls: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200',
          title: 'Application not approved',
          body: profile.rejection_reason || 'Please contact ParkCo support for details.',
        };
      default:
        return null;
    }
  })();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate('/services');
              }
            }}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
          <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
             Driver Partner
          </span>
          <button
            onClick={() => loadAll()}
            disabled={refreshing}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-5 space-y-4">
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toast}
          </div>
        )}

        {/* Profile + availability */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-5 shadow-lg border border-indigo-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {profile.photo_url ? (
                <img
                  src={getFullImageUrl(profile.photo_url)}
                  alt={profile.full_name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-800 flex items-center justify-center text-2xl"></div>
              )}
              <div>
                <h1 className="text-lg font-black leading-tight">{profile.full_name}</h1>
                <p className="text-[11px] text-indigo-200 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {profile.city}
                  {profile.service_area ? ` · ${profile.service_area}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {profile.rating.toFixed(1)} ({profile.rating_count})
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-full">
                    <Route className="w-3 h-3" /> {profile.total_trips} trips
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="w-3 h-3" /> KYC verified
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleAvailability}
              disabled={profile.status !== 'ACTIVE' || togglingAvail}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border transition disabled:opacity-40 ${
                profile.is_available && profile.status === 'ACTIVE'
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white/10 border-white/20 text-slate-200'
              }`}
            >
              {togglingAvail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />}
              <span className="text-[10px] font-black uppercase tracking-wider">
                {profile.status !== 'ACTIVE' ? 'Locked' : profile.is_available ? 'Online' : 'Offline'}
              </span>
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className={`flex items-start gap-2.5 border rounded-2xl px-4 py-3 ${statusBanner.cls}`}>
            <span className="mt-0.5">{statusBanner.icon}</span>
            <div>
              <p className="text-xs font-black">{statusBanner.title}</p>
              <p className="text-[11px] opacity-80 mt-0.5">{statusBanner.body}</p>
            </div>
          </div>
        )}

        {profile.status === 'ACTIVE' && !profile.is_available && (
          <div className="flex items-start gap-2.5 border rounded-2xl px-4 py-3 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
            <Power className="w-4 h-4 mt-0.5" />
            <p className="text-[11px]">
              You're <b>offline</b>. Customers can't see you and new requests won't be shown. Tap the power button to go online.
            </p>
          </div>
        )}

        {/* Earnings */}
        {earnings && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard icon={<Wallet className="w-4 h-4" />} label="Total earned" value={fmtINR(earnings.total_earnings)} accent="emerald" />
            <StatCard icon={<IndianRupee className="w-4 h-4" />} label="This month" value={fmtINR(earnings.this_month_earnings)} sub={`${earnings.this_month_trips} trips`} accent="indigo" />
            <StatCard icon={<Inbox className="w-4 h-4" />} label="Open requests" value={String(earnings.pending_requests)} accent="amber" />
            <StatCard icon={<Route className="w-4 h-4" />} label="Upcoming" value={String(earnings.upcoming_trips)} accent="cyan" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold px-3.5 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl">
          {(
            [
              { id: 'requests', label: 'New requests', icon: Inbox, count: requests.length },
              { id: 'trips', label: 'My trips', icon: Route, count: activeTrips.length },
              { id: 'history', label: 'History', icon: History, count: historyTrips.length },
            ] as { id: Tab; label: string; icon: any; count: number }[]
          ).map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black transition ${
                  on ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                {t.count > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full ${on ? 'bg-indigo-600 text-white' : 'bg-gray-300 dark:bg-slate-700'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab contents */}
        {tab === 'requests' && (
          <div className="space-y-3">
            {profile.status !== 'ACTIVE' ? (
              <EmptyState icon={<Hourglass className="w-6 h-6" />} title="Requests unlock after approval" body="Once an admin approves your profile you'll see live trip requests from customers in your city here." />
            ) : requests.length === 0 ? (
              <EmptyState
                icon={<Inbox className="w-6 h-6" />}
                title={profile.is_available ? `No open requests in ${profile.city} right now` : 'You are offline'}
                body={profile.is_available ? 'New requests appear here automatically — keep this screen open.' : 'Go online to start receiving requests.'}
              />
            ) : (
              requests.map((b) => (
                <TripCard key={b.id} b={b} tick={tick}>
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">You earn</p>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{fmtINR(b.estimated_driver_fee)}</p>
                      <p className="text-[10px] text-gray-400">{b.estimated_hours} hrs · customer pays {fmtINR(b.estimated_total)}</p>
                    </div>
                    <button
                      onClick={() => accept(b)}
                      disabled={busyId === b.id}
                      className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 disabled:opacity-60"
                    >
                      {busyId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Accept trip
                    </button>
                  </div>
                </TripCard>
              ))
            )}
          </div>
        )}

        {tab === 'trips' && (
          <div className="space-y-3">
            {activeTrips.length === 0 ? (
              <EmptyState icon={<Route className="w-6 h-6" />} title="No active trips" body="Accepted and confirmed trips show up here with Start / End trip controls." />
            ) : (
              activeTrips.map((b) => (
                <TripCard key={b.id} b={b} tick={tick}>
                  {/* Customer contact (after payment) */}
                  {b.customer && (
                    <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl px-3.5 py-2.5">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Customer</p>
                        <p className="text-xs font-black">{b.customer.full_name}</p>
                        {b.customer.phone_number ? (
                          <p className="text-[11px] font-mono text-gray-600 dark:text-slate-300">{b.customer.phone_number}</p>
                        ) : (
                          <p className="text-[10px] text-gray-400">Phone unlocks after customer pays</p>
                        )}
                      </div>
                      {b.customer.phone_number && (
                        <a
                          href={`tel:${b.customer.phone_number}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black"
                        >
                          <PhoneCall className="w-3.5 h-3.5" /> Call
                        </a>
                      )}
                    </div>
                  )}

                  {b.status === 'DRIVER_ACCEPTED' && (
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Waiting for the customer to pay {fmtINR(b.estimated_total)}. You'll be notified.
                      </p>
                      <button
                        onClick={() => release(b)}
                        disabled={busyId === b.id}
                        className="text-[11px] font-bold text-gray-500 hover:text-red-600 px-3 py-2"
                      >
                        Release
                      </button>
                    </div>
                  )}

                  {b.status === 'CONFIRMED' && (
                    <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        Paid {fmtINR(b.amount_paid)}. When you reach the pickup point, ask the customer for their <b>START OTP</b>.
                      </p>
                      <div className="flex gap-2">
                        {b.pickup_latitude && b.pickup_longitude && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${b.pickup_latitude},${b.pickup_longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-slate-800 text-xs font-bold"
                          >
                            <Navigation className="w-4 h-4" /> Navigate
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setOtp('');
                            setOtpError('');
                            setOtpModal({ booking: b, mode: 'start' });
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30"
                        >
                          <KeyRound className="w-4 h-4" /> Start trip
                        </button>
                      </div>
                    </div>
                  )}

                  {b.status === 'TRIP_STARTED' && (
                    <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
                      <LiveMeter b={b} tick={tick} />
                      <button
                        onClick={() => {
                          setOtp('');
                          setOtpError('');
                          setOtpModal({ booking: b, mode: 'end' });
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 text-white text-xs font-black"
                      >
                        <KeyRound className="w-4 h-4" /> End trip
                      </button>
                    </div>
                  )}

                  {b.status === 'PAYMENT_DUE' && (
                    <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                      <p className="text-[11px] text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Trip ended with {b.overtime_hours} hrs overtime. Waiting for the customer to pay the{' '}
                        {fmtINR(b.balance_due)} balance; your {fmtINR(b.final_driver_fee)} will be credited after that.
                      </p>
                    </div>
                  )}
                </TripCard>
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            {historyTrips.length === 0 ? (
              <EmptyState icon={<History className="w-6 h-6" />} title="No past trips yet" body="Completed and cancelled trips will be listed here with your earnings." />
            ) : (
              historyTrips.map((b) => (
                <TripCard key={b.id} b={b} tick={tick} compact>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      {b.status === 'COMPLETED' ? (
                        <>
                          {b.billable_hours} hrs billed
                          {b.overtime_hours > 0 ? ` (incl. ${b.overtime_hours} hrs overtime)` : ''}
                          {b.customer_rating ? (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-amber-500">
                              <Star className="w-3 h-3 fill-amber-500" /> {b.customer_rating}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        b.cancellation_reason || STATUS_META[b.status]?.label
                      )}
                    </div>
                    {b.status === 'COMPLETED' && (
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{fmtINR(b.driver_earning)}</span>
                    )}
                  </div>
                </TripCard>
              ))
            )}
          </div>
        )}

        <p className="text-center text-[10px] text-gray-400 pt-2">
          Rates are set by ParkCo.{' '}
          <Link to="/" className="underline">
            Back to partner services
          </Link>
        </p>
      </div>

      {/* OTP modal */}
      {otpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black">{otpModal.mode === 'start' ? 'Start trip' : 'End trip'}</h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                  {otpModal.mode === 'start'
                    ? 'Ask the customer for the START OTP displayed in their ParkCo app.'
                    : 'Ask the customer for the END OTP. The fare is calculated from start to now.'}
                </p>
              </div>
              <button onClick={() => setOtpModal(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5 text-[11px]">
              <p className="font-black">{otpModal.booking.booking_reference}</p>
              <p className="text-gray-500 dark:text-slate-400 truncate">{otpModal.booking.pickup_address}</p>
            </div>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && submitOtp()}
              placeholder="• • • •"
              className="w-full text-center tracking-[0.6em] text-2xl font-black py-3 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {otpError && (
              <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {otpError}
              </p>
            )}
            <button
              onClick={submitOtp}
              disabled={otpBusy}
              className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black text-white disabled:opacity-60 ${
                otpModal.mode === 'start' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {otpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {otpModal.mode === 'start' ? 'Verify & start meter' : 'Verify & end trip'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------------ */

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; accent: 'emerald' | 'indigo' | 'amber' | 'cyan' }> = ({
  icon,
  label,
  value,
  sub,
  accent,
}) => {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
    cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50',
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-3">
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center mb-2 ${colors[accent]}`}>{icon}</div>
      <p className="text-sm font-black leading-none">{value}</p>
      <p className="text-[10px] text-gray-400 font-bold mt-1">{label}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 rounded-3xl p-8 text-center">
    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center mx-auto mb-3">{icon}</div>
    <p className="text-xs font-black">{title}</p>
    <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">{body}</p>
  </div>
);

const TripCard: React.FC<{ b: DriverBooking; tick: number; compact?: boolean; children?: React.ReactNode }> = ({ b, compact, children }) => {
  const meta = STATUS_META[b.status] || { label: b.status, cls: 'bg-gray-100 text-gray-600' };
  const isNight = b.trip_type === 'NIGHT';
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-black text-gray-400">{b.booking_reference}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
        </div>
        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
          {isNight ? <Moon className="w-3 h-3" /> : <Route className="w-3 h-3" />}
          {b.trip_type.toLowerCase()}
        </span>
      </div>

      <div className="flex items-start gap-2.5">
        <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-black truncate">{b.pickup_address}</p>
          <p className="text-[10px] text-gray-400">
            {b.pickup_city}
            {b.drop_address ? ` → ${b.drop_address}` : ''}
          </p>
        </div>
      </div>

      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2 text-[11px]`}>
        <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Schedule
          </p>
          <p className="font-bold">{fmtDT(b.start_time)}</p>
          <p className="text-gray-500 dark:text-slate-400">to {fmtDT(b.end_time)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
            <Car className="w-3 h-3" /> Car
          </p>
          <p className="font-bold">
            {b.car_type.charAt(0) + b.car_type.slice(1).toLowerCase()} · {b.transmission.charAt(0) + b.transmission.slice(1).toLowerCase()}
          </p>
          <p className="text-gray-500 dark:text-slate-400">
            {b.seater}-seater{b.car_make_model ? ` · ${b.car_make_model}` : ''}
          </p>
        </div>
        {!compact && (
          <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
              <Timer className="w-3 h-3" /> Duration
            </p>
            <p className="font-bold">{b.estimated_hours} hrs booked</p>
            <p className="text-gray-500 dark:text-slate-400">{fmtINR(b.hourly_rate * b.car_multiplier)}/hr</p>
          </div>
        )}
      </div>

      {b.notes && !compact && (
        <p className="text-[11px] text-gray-500 dark:text-slate-400 italic bg-amber-50/60 dark:bg-amber-950/20 rounded-xl px-3 py-2">“{b.notes}”</p>
      )}

      {children}
    </div>
  );
};

const LiveMeter: React.FC<{ b: DriverBooking; tick: number }> = ({ b }) => {
  const startedAt = b.trip_started_at ? new Date(b.trip_started_at).getTime() : Date.now();
  const elapsedMin = Math.max(0, (Date.now() - startedAt) / 60000);
  const bookedMin = b.estimated_hours * 60;
  const overtime = Math.max(0, elapsedMin - bookedMin);
  const pct = Math.min(100, (elapsedMin / bookedMin) * 100);
  return (
    <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900 rounded-2xl p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase font-black text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" /> Meter running
        </p>
        <p className="text-[10px] text-cyan-700/70 dark:text-cyan-300/70">since {fmtDT(b.trip_started_at)}</p>
      </div>
      <p className="font-mono text-2xl font-black text-cyan-900 dark:text-cyan-100">{fmtDuration(elapsedMin)}</p>
      <div className="h-1.5 rounded-full bg-cyan-200/60 dark:bg-cyan-900 overflow-hidden">
        <div className={`h-full ${overtime > 0 ? 'bg-orange-500' : 'bg-cyan-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-cyan-800 dark:text-cyan-200">
        {overtime > 0
          ? `Overtime ${fmtDuration(overtime)} — extra will be billed to the customer at the end.`
          : `Booked for ${b.estimated_hours} hrs · minimum fare ${fmtINR(b.estimated_total)} already paid.`}
      </p>
    </div>
  );
};
