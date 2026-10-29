import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Clock,
  AlertCircle,
  Droplets,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { CarSpaBooking } from '../types';

const fmtINR = (n?: number | null) =>
  `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;

const statusLabel = (s: string) => {
  switch (s) {
    case 'AWAITING_PAYMENT':
      return 'Awaiting payment';
    case 'PAID_AWAITING_SLOT':
      return 'Paid · waiting for slot';
    case 'SLOT_ASSIGNED':
      return 'Slot assigned';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return s.replace(/_/g, ' ');
  }
};

const fmtWhen = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const MyCarSpaBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CarSpaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getMyCarSpaBookings()
      .then(setRows)
      .catch((err: any) => setError(err.message || 'Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/services/car-spa')} className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Car spa
          </button>
          <span className="text-xs font-black">My spa bookings</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-3">
        {error && (
          <div className="flex gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {loading ? (
          <div className="py-16 flex justify-center text-slate-400 text-xs font-bold gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-2">
            <Droplets className="w-8 h-8 text-cyan-500 mx-auto" />
            <p className="text-sm font-black">No spa bookings yet</p>
            <Link to="/services/car-spa" className="text-xs font-bold text-cyan-600 hover:underline">
              Browse car spas
            </Link>
          </div>
        ) : (
          rows.map((b) => (
            <Link
              key={b.id}
              to={`/car-spa/bookings/${b.id}`}
              className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 hover:border-cyan-400 transition"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono font-bold text-slate-400">{b.booking_reference}</p>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{b.service_name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">{b.spa_name} · {b.spa_city}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Wanted {b.wanted_date}</p>
                  {b.slot_start && (
                    <p className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {fmtWhen(b.slot_start)}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black">{fmtINR(b.amount_paid || b.service_price)}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">{statusLabel(b.status)}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export const CarSpaBookingDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<CarSpaBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setBooking(await api.getCarSpaBooking(Number(id)));
    } catch (err: any) {
      setError(err.message || 'Booking not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pay = async () => {
    if (!booking) return;
    setPaying(true);
    setError('');
    try {
      const order = await api.createCarSpaPaymentOrder(booking.id);
      if (order.mock_mode) {
        setBooking(
          await api.verifyCarSpaPayment(booking.id, {
            order_id: order.order_id,
            payment_id: `pay_mock_${Date.now()}`,
            signature: 'mock',
          })
        );
      } else {
        const Razorpay = (window as any).Razorpay;
        if (!Razorpay) throw new Error('Payment service unavailable');
        await new Promise<void>((resolve, reject) => {
          const rzp = new Razorpay({
            key: order.key_id,
            amount: order.amount_in_paise,
            currency: order.currency || 'INR',
            name: 'ParkCo Car Spa',
            description: order.description,
            order_id: order.order_id,
            theme: { color: '#0891b2' },
            modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
            handler: async (response: any) => {
              try {
                setBooking(
                  await api.verifyCarSpaPayment(booking.id, {
                    order_id: response.razorpay_order_id || order.order_id,
                    payment_id: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                  })
                );
                resolve();
              } catch (err) {
                reject(err);
              }
            },
          });
          rzp.open();
        });
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-bold text-slate-400 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm font-black">{error || 'Booking not found'}</p>
        <button onClick={() => navigate('/car-spa/bookings')} className="text-xs font-bold text-cyan-600">
          Back to bookings
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center">
          <button onClick={() => navigate('/car-spa/bookings')} className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Bookings
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-6 space-y-4">
        {error && (
          <div className="flex gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-400">{booking.booking_reference}</p>
            <h1 className="text-xl font-black mt-1">{booking.service_name}</h1>
            <p className="text-xs text-slate-500 mt-1">{statusLabel(booking.status)}</p>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-black text-slate-800 dark:text-white">{booking.spa_name}</p>
            <p className="text-slate-500 flex items-start gap-1">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {booking.contact_unlocked || booking.spa_address
                ? `${booking.spa_address || ''}${booking.spa_city ? `, ${booking.spa_city}` : ''}`
                : booking.spa_city}
            </p>
            {booking.contact_unlocked && booking.spa_phone ? (
              <a href={`tel:${booking.spa_phone}`} className="flex items-center gap-1 font-bold text-cyan-700 dark:text-cyan-300">
                <Phone className="w-3.5 h-3.5" /> {booking.spa_phone}
              </a>
            ) : (
              <p className="flex items-center gap-1 text-slate-400">
                <Lock className="w-3.5 h-3.5" /> Spa phone unlocks after payment
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Wanted date</p>
              <p className="font-black mt-1">{booking.wanted_date}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Amount</p>
              <p className="font-black mt-1">{fmtINR(booking.amount_paid || booking.service_price)}</p>
            </div>
          </div>

          {booking.slot_start ? (
            <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase text-cyan-700 dark:text-cyan-300">Your assigned slot</p>
              <p className="text-sm font-black mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4" /> {fmtWhen(booking.slot_start)}
              </p>
              {booking.slot_end && (
                <p className="text-[11px] text-slate-500 mt-1">Until {fmtWhen(booking.slot_end)}</p>
              )}
            </div>
          ) : booking.status === 'PAID_AWAITING_SLOT' ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 text-xs font-bold text-amber-800 dark:text-amber-200">
              Payment received. The spa will assign your visit time shortly.
            </div>
          ) : null}

          {booking.customer_note && (
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Your note</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{booking.customer_note}</p>
            </div>
          )}

          {booking.status === 'AWAITING_PAYMENT' && (
            <button
              type="button"
              onClick={pay}
              disabled={paying}
              className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {paying && <Loader2 className="w-4 h-4 animate-spin" />}
              Pay {fmtINR(booking.service_price)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
