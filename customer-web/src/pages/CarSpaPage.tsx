import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  LocateFixed,
  Loader2,
  Clock,
  Droplets,
  Phone,
  Lock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CarSpaCenter, CarSpaServiceItem } from '../types';

const fmtINR = (n?: number | null) =>
  `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;

async function cityFromCoords(latitude: number, longitude: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const city = String(data.city || data.locality || '').trim();
      if (city) return city;
    }
  } catch {}
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
    );
    if (res.ok) {
      const data = await res.json();
      const address = data?.address || {};
      return String(address.city || address.town || address.village || address.municipality || '').trim() || null;
    }
  } catch {}
  return null;
}

const inputCls =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500';

export const CarSpaPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [city, setCity] = useState(searchParams.get('city') || '');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [spas, setSpas] = useState<CarSpaCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<CarSpaCenter | null>(null);
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [wantedDate, setWantedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedService: CarSpaServiceItem | undefined = useMemo(
    () => selected?.services.find((s) => s.id === serviceId),
    [selected, serviceId]
  );

  const loadSpas = async (opts?: { city?: string; lat?: number | null; lng?: number | null }) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listCarSpas({
        city: (opts?.city ?? city).trim() || undefined,
        lat: opts?.lat ?? lat ?? undefined,
        lng: opts?.lng ?? lng ?? undefined,
      });
      setSpas(data);
    } catch (err: any) {
      setError(err.message || 'Could not load car spas');
      setSpas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = Number(pos.coords.latitude.toFixed(6));
        const longitude = Number(pos.coords.longitude.toFixed(6));
        setLat(latitude);
        setLng(longitude);
        const detected = await cityFromCoords(latitude, longitude);
        if (detected) setCity(detected);
        await loadSpas({ city: detected || city, lat: latitude, lng: longitude });
        setLocating(false);
      },
      () => {
        setError('Could not read your location. Enter a city instead.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const openSpa = async (spa: CarSpaCenter) => {
    setError('');
    try {
      const detail = await api.getCarSpa(spa.id);
      setSelected(detail);
      setServiceId(detail.services[0]?.id || '');
    } catch (err: any) {
      setError(err.message || 'Could not open spa');
    }
  };

  const payForBooking = async (bookingId: number) => {
    const order = await api.createCarSpaPaymentOrder(bookingId);
    if (order.mock_mode) {
      return api.verifyCarSpaPayment(bookingId, {
        order_id: order.order_id,
        payment_id: `pay_mock_${Date.now()}`,
        signature: 'mock',
      });
    }
    const Razorpay = (window as any).Razorpay;
    if (!Razorpay) throw new Error('Payment service unavailable. Please refresh.');
    return new Promise<any>((resolve, reject) => {
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
            const updated = await api.verifyCarSpaPayment(bookingId, {
              order_id: response.razorpay_order_id || order.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            resolve(updated);
          } catch (err) {
            reject(err);
          }
        },
      });
      rzp.on('payment.failed', () => reject(new Error('Payment failed')));
      rzp.open();
    });
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!selected || !serviceId) {
      setError('Select a service to continue.');
      return;
    }
    setSubmitting(true);
    setError('');
    let bookingId: number | null = null;
    try {
      const booking = await api.createCarSpaBooking({
        center_id: selected.id,
        service_id: Number(serviceId),
        wanted_date: wantedDate,
        customer_note: note.trim() || null,
      });
      bookingId = booking.id;
      const paid = await payForBooking(booking.id);
      navigate(`/car-spa/bookings/${paid.id}`);
    } catch (err: any) {
      // Booking may already exist if payment was dismissed — send user to resume pay.
      if (bookingId) {
        navigate(`/car-spa/bookings/${bookingId}`);
        return;
      }
      setError(err.message || 'Failed to book car spa');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <Link to="/car-spa/bookings" className="text-xs font-black text-cyan-600 dark:text-cyan-400 hover:underline">
            My spa bookings
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-b from-cyan-950 via-slate-900 to-slate-950 text-white py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 px-3 py-1 rounded-full text-xs font-extrabold">
            <Droplets className="w-3.5 h-3.5" />
            Workshop car spa · Pay to unlock contact · Host assigns your slot
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Find a <span className="bg-gradient-to-r from-cyan-300 to-teal-200 bg-clip-text text-transparent">Car Spa</span> near you
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <label className="text-[11px] font-bold uppercase text-slate-500">City</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Chennai"
              className={inputCls}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  loadSpas();
                }
              }}
            />
            <button
              type="button"
              onClick={() => loadSpas()}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black"
            >
              Search
            </button>
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400"
          >
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
            {locating ? 'Detecting city…' : lat && lng && city ? `Using ${city}` : 'Use my current location'}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold px-3.5 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">
                {city.trim() ? `Spas in ${city.trim()}` : 'Active workshops'}
              </h2>
              <span className="text-[10px] font-bold text-slate-400">{spas.length} found</span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading spas…
              </div>
            ) : spas.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-2">
                <p className="text-sm font-black text-slate-800 dark:text-white">No approved car spas here yet</p>
                <p className="text-xs text-slate-500">Try another city, or check back after partners go live.</p>
              </div>
            ) : (
              spas.map((spa) => (
                <button
                  key={spa.id}
                  type="button"
                  onClick={() => openSpa(spa)}
                  className={`w-full text-left bg-white dark:bg-slate-900 border rounded-3xl p-4 shadow-sm transition ${
                    selected?.id === spa.id
                      ? 'border-cyan-500 ring-2 ring-cyan-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-100 dark:border-cyan-900 flex items-center justify-center shrink-0 overflow-hidden">
                      {spa.photo_url ? (
                        <img src={spa.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Droplets className="w-6 h-6 text-cyan-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">{spa.name}</h3>
                        {spa.distance_km != null && (
                          <span className="text-[10px] font-bold text-cyan-600 shrink-0">{spa.distance_km} km</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {spa.city} · {spa.address}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {spa.services.length} service{spa.services.length === 1 ? '' : 's'}
                        {spa.services[0] ? ` · from ${fmtINR(Math.min(...spa.services.map((s) => s.price)))}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 mt-2 shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm sticky top-20 space-y-4">
              {!selected ? (
                <p className="text-xs text-slate-500 py-8 text-center">Select a spa to view services and book a date.</p>
              ) : (
                <form onSubmit={handleBook} className="space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">{selected.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {selected.address}, {selected.city}
                    </p>
                    {selected.operating_hours && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {selected.operating_hours}
                      </p>
                    )}
                    {selected.contact_unlocked && selected.phone ? (
                      <p className="text-[11px] text-cyan-700 dark:text-cyan-300 mt-2 flex items-center gap-1 font-bold">
                        <Phone className="w-3.5 h-3.5" /> {selected.phone}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Phone unlocks after payment
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-500">Service *</label>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {selected.services.map((svc) => (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => setServiceId(svc.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs ${
                            serviceId === svc.id
                              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex justify-between gap-2">
                            <span className="font-black text-slate-900 dark:text-white">{svc.name}</span>
                            <span className="font-black text-cyan-700 dark:text-cyan-300">{fmtINR(svc.price)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {svc.duration_minutes} min
                            {svc.description ? ` · ${svc.description}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-slate-500">Wanted date *</label>
                    <input
                      type="date"
                      required
                      value={wantedDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setWantedDate(e.target.value)}
                      className={inputCls}
                    />
                    <p className="text-[10px] text-slate-400">The spa will assign an exact time slot after you pay.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-slate-500">Message (optional)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Car model, stains, preferred morning/evening…"
                      className={`${inputCls} font-medium`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedService}
                    className="w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : !user ? (
                      <Lock className="w-4 h-4" />
                    ) : null}
                    {!user
                      ? 'Sign in to book'
                      : selectedService
                        ? `Pay ${fmtINR(selectedService.price)} & book`
                        : 'Select a service'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
