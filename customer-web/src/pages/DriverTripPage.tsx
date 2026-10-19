import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, getFullImageUrl } from '../services/api';
import { DriverBooking, AppNotification } from '../types';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Car,
  Clock,
  Star,
  PhoneCall,
  KeyRound,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Timer,
  Lock,
  RefreshCw,
} from 'lucide-react';

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

const STEPS = [
  { id: 'REQUESTED', label: 'Driver requested' },
  { id: 'DRIVER_ACCEPTED', label: 'Driver confirmed' },
  { id: 'CONFIRMED', label: 'Paid · details unlocked' },
  { id: 'TRIP_STARTED', label: 'Trip in progress' },
  { id: 'COMPLETED', label: 'Completed' },
];

function stepIndex(status: string) {
  if (status === 'PAYMENT_DUE') return 3;
  if (status === 'CANCELLED' || status === 'EXPIRED') return -1;
  const i = STEPS.findIndex((s) => s.id === status);
  return i;
}

export const DriverTripPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingId = Number(id);

  const [booking, setBooking] = useState<DriverBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [ratingBusy, setRatingBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const lastStatus = useRef<string>('');
  const seenNotifIds = useRef<Set<number>>(new Set());

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 4000);
  };

  const load = useCallback(
    async (silent = false) => {
      if (!bookingId) return;
      try {
        const b = await api.getDriverBooking(bookingId);
        if (lastStatus.current && lastStatus.current !== b.status) {
          if (b.status === 'DRIVER_ACCEPTED') showToast('Driver confirmed — pay to unlock contact details');
          if (b.status === 'CONFIRMED') showToast('Payment received. Driver details are now visible.');
          if (b.status === 'TRIP_STARTED') showToast('Trip started. Share the END OTP when you arrive.');
          if (b.status === 'PAYMENT_DUE') showToast(`Trip ended. Pay ${fmtINR(b.balance_due)} overtime balance.`);
          if (b.status === 'COMPLETED') showToast('Trip completed. Thank you!');
        }
        lastStatus.current = b.status;
        setBooking(b);
        setError('');
      } catch (err: any) {
        if (!silent) setError(err.message || 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    },
    [bookingId]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => load(true), 3000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!booking || booking.status !== 'TRIP_STARTED') return;
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [booking?.status]);

  // Surface "driver confirmed" notifications
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const notes: AppNotification[] = await api.getMyNotifications();
        if (cancelled) return;
        for (const n of notes.slice(0, 8)) {
          if (seenNotifIds.current.has(n.id)) continue;
          seenNotifIds.current.add(n.id);
          const fresh = Date.now() - new Date(n.created_at).getTime() < 60_000;
          if (fresh && /driver confirmed/i.test(n.title + n.message)) {
            showToast(n.title || 'Driver confirmed');
          }
        }
      } catch {}
    };
    poll();
    const t = window.setInterval(poll, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {}
  };

  const pay = async () => {
    if (!booking) return;
    setPaying(true);
    setError('');
    try {
      const order = await api.createDriverPaymentOrder(booking.id);
      if (order.mock_mode) {
        const updated = await api.verifyDriverPayment(booking.id, {
          order_id: order.order_id,
          payment_id: `pay_mock_${Date.now()}`,
          signature: 'mock',
        });
        setBooking(updated);
        showToast(
          order.purpose === 'BALANCE'
            ? 'Balance paid. Trip complete.'
            : 'Paid. Driver contact and START OTP are now visible.'
        );
        setPaying(false);
        return;
      }
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        throw new Error('Payment service unavailable. Please refresh.');
      }
      const options = {
        key: order.key_id,
        amount: order.amount_in_paise,
        currency: order.currency || 'INR',
        name: 'ParkCo Acting Driver',
        description: order.description,
        order_id: order.order_id,
        theme: { color: '#4f46e5' },
        modal: { ondismiss: () => setPaying(false) },
        handler: async (response: any) => {
          try {
            const updated = await api.verifyDriverPayment(booking.id, {
              order_id: response.razorpay_order_id || order.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setBooking(updated);
            showToast('Payment confirmed.');
          } catch (err: any) {
            setError(err.message || 'Payment verification failed');
          } finally {
            setPaying(false);
          }
        },
      };
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', () => setPaying(false));
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Failed to start payment');
      setPaying(false);
    }
  };

  const cancel = async () => {
    if (!booking) return;
    if (!window.confirm('Cancel this driver request?')) return;
    setCancelling(true);
    try {
      const updated = await api.cancelDriverBooking(booking.id);
      setBooking(updated);
      showToast(
        updated.refund_amount > 0 ? `Cancelled. Refund ${fmtINR(updated.refund_amount)}.` : 'Request cancelled.'
      );
    } catch (err: any) {
      setError(err.message || 'Could not cancel');
    } finally {
      setCancelling(false);
    }
  };

  const submitRating = async () => {
    if (!booking) return;
    setRatingBusy(true);
    try {
      const updated = await api.rateDriverTrip(booking.id, rating, review);
      setBooking(updated);
      showToast('Thanks for the rating.');
    } catch (err: any) {
      setError(err.message || 'Failed to rate');
    } finally {
      setRatingBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading trip…
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-sm font-black">Trip not found</p>
        <p className="text-xs text-slate-500">{error || 'This driver trip does not exist or is not yours.'}</p>
        <Link to="/drivers/trips" className="text-xs font-bold text-indigo-600">
          My driver trips
        </Link>
      </div>
    );
  }

  const idx = stepIndex(booking.status);
  const contact = booking.driver_contact;
  const preview = booking.driver;
  const payable =
    booking.status === 'DRIVER_ACCEPTED'
      ? booking.estimated_total - booking.amount_paid
      : booking.status === 'PAYMENT_DUE'
      ? booking.balance_due
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/drivers/trips')} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            <ArrowLeft className="w-4 h-4" /> Trips
          </button>
          <span className="font-mono text-[11px] font-black text-slate-400">{booking.booking_reference}</span>
          <button onClick={() => load()} className="p-2 text-slate-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toast}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 text-xs font-bold px-3.5 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Timeline */}
        {idx >= 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4">
            <ol className="space-y-2.5">
              {STEPS.map((s, i) => {
                const done = i < idx || (i === idx && booking.status !== 'REQUESTED');
                const current = i === idx;
                return (
                  <li key={s.id} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        done || current ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {done && !current ? '✓' : i + 1}
                    </span>
                    <span className={`text-xs font-bold ${current ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}>
                      {s.label}
                    </span>
                    {current && booking.status === 'REQUESTED' && (
                      <span className="ml-auto text-[10px] font-black text-indigo-500 animate-pulse">Searching…</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {(booking.status === 'CANCELLED' || booking.status === 'EXPIRED') && (
          <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl p-4 text-xs font-bold text-slate-600 dark:text-slate-300">
            {booking.status === 'EXPIRED' ? 'This request expired before a driver accepted.' : `Cancelled${booking.cancellation_reason ? `: ${booking.cancellation_reason}` : ''}`}
            {booking.refund_amount > 0 ? ` · refund ${fmtINR(booking.refund_amount)}` : ''}
          </div>
        )}

        {/* Searching state */}
        {booking.status === 'REQUESTED' && (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-3xl p-5 text-center space-y-2">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-black">Driver requested</p>
            <p className="text-[11px] text-slate-500">
              Nearby verified chauffeurs in {booking.pickup_city} have been notified. You'll get a confirmation the moment one accepts.
            </p>
          </div>
        )}

        {/* Driver card */}
        {(preview || contact) && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center gap-3">
              {(contact?.photo_url || preview?.photo_url) ? (
                <img
                  src={getFullImageUrl(contact?.photo_url || preview?.photo_url || '')}
                  alt=""
                  className="w-14 h-14 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-2xl"></div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black truncate">{contact?.full_name || preview?.display_name}</p>
                <p className="text-[11px] text-slate-400">
                  {(contact || preview)?.badge} · {(contact || preview)?.experience_years} yrs ·{' '}
                  <Star className="w-3 h-3 inline fill-amber-400 text-amber-400" /> {(contact || preview)?.rating.toFixed(1)}
                </p>
                {contact ? (
                  <p className="text-[11px] font-mono font-bold mt-0.5">{contact.phone} · DL {contact.dl_number_masked}</p>
                ) : (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                    <Lock className="w-3 h-3" /> Pay to unlock phone & full name
                  </p>
                )}
              </div>
              {contact?.phone && (
                <a href={`tel:${contact.phone}`} className="p-3 rounded-2xl bg-emerald-600 text-white">
                  <PhoneCall className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* OTP cards */}
        {booking.start_otp && booking.status === 'CONFIRMED' && (
          <OtpCard
            label="START OTP"
            hint="Share this with the driver when they arrive. They enter it to start the meter."
            value={booking.start_otp}
            copied={copied === 'start'}
            onCopy={() => copy('start', booking.start_otp!)}
            accent="emerald"
          />
        )}
        {booking.end_otp && booking.status === 'TRIP_STARTED' && (
          <OtpCard
            label="END OTP"
            hint="Share this when you want the trip to end. Fare is calculated from start to that moment."
            value={booking.end_otp}
            copied={copied === 'end'}
            onCopy={() => copy('end', booking.end_otp!)}
            accent="slate"
          />
        )}

        {booking.status === 'TRIP_STARTED' && booking.trip_started_at && (
          <LiveFare b={booking} tick={tick} />
        )}

        {/* Trip facts */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-indigo-500 mt-0.5" />
            <div>
              <p className="text-xs font-black">{booking.pickup_address}</p>
              <p className="text-[11px] text-slate-400">
                {booking.pickup_city}
                {booking.drop_address ? ` → ${booking.drop_address}` : ''}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <Fact icon={<Clock className="w-3 h-3" />} label="Schedule" value={`${fmtDT(booking.start_time)} → ${fmtDT(booking.end_time)}`} />
            <Fact
              icon={<Car className="w-3 h-3" />}
              label="Your car"
              value={`${booking.car_type} · ${booking.transmission} · ${booking.seater}-seater${booking.car_make_model ? ` · ${booking.car_make_model}` : ''}`}
            />
          </div>
          <div className="flex justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">
              {booking.final_total != null ? 'Final fare' : 'Estimated fare'}
            </span>
            <span className="font-black">
              {fmtINR(booking.final_total ?? booking.estimated_total)}
              {booking.amount_paid > 0 ? ` · paid ${fmtINR(booking.amount_paid)}` : ''}
            </span>
          </div>
        </div>

        {/* Actions */}
        {payable > 0 && (
          <button
            onClick={pay}
            disabled={paying}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 disabled:opacity-60"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {booking.status === 'PAYMENT_DUE' ? `Pay overtime balance ${fmtINR(payable)}` : `Pay ${fmtINR(payable)} to unlock driver`}
          </button>
        )}

        {['REQUESTED', 'DRIVER_ACCEPTED', 'CONFIRMED'].includes(booking.status) && (
          <button
            onClick={cancel}
            disabled={cancelling}
            className="w-full py-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            {cancelling ? 'Cancelling…' : 'Cancel trip'}
          </button>
        )}

        {booking.status === 'COMPLETED' && !booking.customer_rating && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <p className="text-sm font-black">How was your chauffeur?</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="p-1">
                  <Star className={`w-7 h-7 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={2}
              placeholder="Optional comment"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
            <button
              onClick={submitRating}
              disabled={ratingBusy}
              className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-black"
            >
              {ratingBusy ? 'Saving…' : 'Submit rating'}
            </button>
          </div>
        )}

        {booking.status === 'COMPLETED' && booking.customer_rating && (
          <p className="text-center text-xs text-slate-400">
            You rated this trip {booking.customer_rating}★{booking.customer_review ? ` — “${booking.customer_review}”` : ''}
          </p>
        )}
      </div>
    </div>
  );
};

const OtpCard: React.FC<{
  label: string;
  hint: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  accent: 'emerald' | 'slate';
}> = ({ label, hint, value, copied, onCopy, accent }) => (
  <div
    className={`rounded-3xl p-5 text-center space-y-2 border ${
      accent === 'emerald'
        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
        : 'bg-slate-900 text-white border-slate-800'
    }`}
  >
    <p className={`text-[10px] font-black uppercase tracking-widest ${accent === 'emerald' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
      {label}
    </p>
    <p className="font-mono text-4xl font-black tracking-[0.4em]">{value}</p>
    <p className={`text-[11px] ${accent === 'emerald' ? 'text-emerald-800/70 dark:text-emerald-200/70' : 'text-slate-400'}`}>{hint}</p>
    <button onClick={onCopy} className="inline-flex items-center gap-1 text-[11px] font-bold opacity-80">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy OTP'}
    </button>
  </div>
);

const Fact: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
      {icon} {label}
    </p>
    <p className="font-bold leading-snug mt-0.5">{value}</p>
  </div>
);

const LiveFare: React.FC<{ b: DriverBooking; tick: number }> = ({ b }) => {
  const started = b.trip_started_at ? new Date(b.trip_started_at).getTime() : Date.now();
  const mins = Math.max(0, (Date.now() - started) / 60000);
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const s = Math.floor((mins * 60) % 60);
  const clock = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return (
    <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900 rounded-3xl p-4 space-y-1">
      <p className="text-[10px] uppercase font-black text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" /> Live trip
      </p>
      <p className="font-mono text-2xl font-black">{clock}</p>
      <p className="text-[11px] text-cyan-800 dark:text-cyan-200 flex items-center gap-1">
        <Timer className="w-3 h-3" />
        Running total ≈ {fmtINR(b.live_running_total ?? b.estimated_total)} (minimum {fmtINR(b.estimated_total)} already paid)
      </p>
    </div>
  );
};
