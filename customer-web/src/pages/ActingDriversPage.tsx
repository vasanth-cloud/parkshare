import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  DriverBooking,
  DriverFareBreakdown,
  DriverPricing,
  Vehicle,
} from '../types';
import {
  ShieldCheck,
  Clock,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Loader2,
  LocateFixed,
  MapPin,
  IndianRupee,
  Moon,
  Lock,
} from 'lucide-react';

const CAR_TYPES = [
  { id: 'HATCHBACK', label: 'Hatchback', hint: 'Swift, i20' },
  { id: 'SEDAN', label: 'Sedan', hint: 'City, Verna' },
  { id: 'SUV', label: 'SUV / MUV', hint: 'Creta, Innova' },
  { id: 'LUXURY', label: 'Luxury', hint: 'BMW, Merc' },
  { id: 'VAN', label: 'Van', hint: 'Traveller' },
];

const SEATERS = [4, 5, 6, 7, 8, 9];

const inputCls =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

const fmtINR = (n?: number | null) =>
  `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string) {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date/time');
  return d.toISOString();
}

function mapVehicleType(t?: string): string {
  if (t === 'SUV') return 'SUV';
  if (t === 'VAN') return 'VAN';
  return 'SEDAN';
}

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
  } catch {
    // Try the second provider below.
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      const address = data?.address || {};
      const city = address.city || address.town || address.village || address.municipality || address.county || '';
      if (city) return String(city).trim();
    }
  } catch {
    // Leave the city field for the customer to type.
  }
  return null;
}

type PlaceHit = {
  id: string;
  title: string;
  subtitle: string;
  city: string;
  lat: number;
  lng: number;
};

async function searchPlaces(
  query: string,
  bias?: { city?: string; lat?: number | null; lng?: number | null }
): Promise<PlaceHit[]> {
  const trimmed = query.trim();
  const city = (bias?.city || '').trim();
  const q = city && !trimmed.toLowerCase().includes(city.toLowerCase()) ? `${trimmed}, ${city}` : trimmed;
  const params = new URLSearchParams({ q, limit: '6', lang: 'en' });
  if (bias?.lat != null && bias?.lng != null) {
    params.set('lat', String(bias.lat));
    params.set('lon', String(bias.lng));
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || [])
    .map((feature: any, index: number) => {
      const place = feature.properties || {};
      const title = [place.name, place.street].filter(Boolean).join(', ') || place.locality || place.city || 'Location';
      const subtitle = [place.locality, place.district, place.city, place.state].filter(Boolean).join(', ');
      const lat = Number(feature.geometry?.coordinates?.[1]);
      const lng = Number(feature.geometry?.coordinates?.[0]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: `${place.osm_id || index}-${title}`,
        title,
        subtitle: subtitle || title,
        city: String(place.city || '').trim(),
        lat,
        lng,
      } as PlaceHit;
    })
    .filter(Boolean) as PlaceHit[];
}

function PlaceSuggestInput({
  label,
  value,
  onChange,
  onPick,
  placeholder,
  required,
  biasCity,
  biasLat,
  biasLng,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (place: PlaceHit) => void;
  placeholder: string;
  required?: boolean;
  biasCity?: string;
  biasLat?: number | null;
  biasLng?: number | null;
}) {
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const typed = useRef(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!typed.current) return;
    const query = value.trim();
    if (query.length < 2) {
      setHits([]);
      setOpen(false);
      setSearching(false);
      return;
    }

    const current = ++requestId.current;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const places = await searchPlaces(query, { city: biasCity, lat: biasLat, lng: biasLng });
        if (current !== requestId.current) return;
        setHits(places);
        setOpen(places.length > 0);
      } catch {
        if (current !== requestId.current) return;
        setHits([]);
        setOpen(false);
      } finally {
        if (current === requestId.current) setSearching(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [value, biasCity, biasLat, biasLng]);

  return (
    <div className="space-y-1 relative">
      <label className="text-[11px] font-bold uppercase text-slate-500">{label}</label>
      <input
        required={required}
        value={value}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (hits.length > 0) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={inputCls}
      />
      {searching && (
        <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-8 text-slate-400" />
      )}
      {open && hits.length > 0 && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {hits.map((place) => (
            <button
              key={place.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                typed.current = false;
                requestId.current += 1;
                setOpen(false);
                setHits([]);
                onPick(place);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <span className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{place.title}</span>
                  <span className="block text-[10px] text-slate-500 truncate">{place.subtitle}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type KnownCar = {
  key: string;
  name: string;
  registration: string;
  vehicleId?: number;
};

function knownCarsFromHistory(vehicles: Vehicle[], trips: DriverBooking[]): KnownCar[] {
  const byKey = new Map<string, KnownCar>();
  const remember = (name: string, registration: string, vehicleId?: number) => {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const plate = registration.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanName) return;
    const key = `${cleanName.toLowerCase()}|${plate}`;
    byKey.set(key, { key, name: cleanName, registration: plate, vehicleId });
  };

  // Older trips first so a newer booking, then a saved vehicle, wins the same name and plate.
  [...trips].reverse().forEach((trip) => {
    if (trip.car_make_model) remember(trip.car_make_model, trip.car_registration || '');
  });
  vehicles.forEach((vehicle) => {
    remember([vehicle.make, vehicle.model].filter(Boolean).join(' '), vehicle.registration_number || '', vehicle.id);
  });
  return [...byKey.values()];
}

function CarNameField({
  value,
  cars,
  onNameChange,
  onPick,
}: {
  value: string;
  cars: KnownCar[];
  onNameChange: (name: string) => void;
  onPick: (car: KnownCar) => void;
}) {
  const query = value.trim().toLowerCase();
  const matches = cars.filter((car) => !query || car.name.toLowerCase().includes(query));

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold uppercase text-slate-500">Make / model</label>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Hyundai Creta"
          autoComplete="off"
          className={`${inputCls} pr-8`}
        />
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 ${matches.length > 0 ? 'rotate-180' : ''}`} />
      </div>
      {matches.length > 0 && (
        <ul className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden max-h-56 overflow-y-auto">
          {matches.map((car) => {
            const selected = car.name.toLowerCase() === query;
            return (
              <li key={car.key}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick(car);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                    selected ? 'bg-indigo-50 dark:bg-slate-800' : 'hover:bg-indigo-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{car.name}</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400"></span>
                  </span>
                  {car.registration && (
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-300 shrink-0">{car.registration}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const ActingDriversPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [pricing, setPricing] = useState<DriverPricing | null>(null);
  const [estimate, setEstimate] = useState<DriverFareBreakdown | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateErr, setEstimateErr] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pastTrips, setPastTrips] = useState<DriverBooking[]>([]);

  const [pickupAddress, setPickupAddress] = useState(searchParams.get('pickup') || '');
  const [pickupCity, setPickupCity] = useState(searchParams.get('city') || '');
  const [dropAddress, setDropAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const nowPlus = (mins: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + mins, 0, 0);
    return d;
  };
  const [startLocal, setStartLocal] = useState(() => toLocalInputValue(nowPlus(30)));
  const [endLocal, setEndLocal] = useState(() => toLocalInputValue(nowPlus(30 + 180)));

  const [carType, setCarType] = useState('SEDAN');
  const [transmission, setTransmission] = useState<'MANUAL' | 'AUTOMATIC'>('AUTOMATIC');
  const [seater, setSeater] = useState(5);
  const [makeModel, setMakeModel] = useState('');
  const [registration, setRegistration] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getDriverPricing().then(setPricing).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    api.getVehicles().then(setVehicles).catch(() => {});
    api.getMyDriverBookings().then(setPastTrips).catch(() => {});
  }, [user]);

  const previousCars = useMemo(() => knownCarsFromHistory(vehicles, pastTrips), [vehicles, pastTrips]);

  // Fill the plate when a saved name is already typed and the trip history arrives afterwards.
  useEffect(() => {
    const name = makeModel.trim().toLowerCase();
    if (!name) return;
    const matches = previousCars.filter(
      (car) => car.registration && car.name.toLowerCase() === name
    );
    const plates = [...new Set(matches.map((car) => car.registration))];
    if (plates.length === 1) {
      setRegistration((current) => current || plates[0]);
    }
  }, [previousCars, makeModel]);

  // Live estimate whenever window / car / city changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setEstimating(true);
      setEstimateErr('');
      try {
        const data = await api.estimateDriverFare({
          start_time: localToIso(startLocal),
          end_time: localToIso(endLocal),
          car_type: carType,
          pickup_city: pickupCity.trim() || undefined,
        });
        if (!cancelled) setEstimate(data);
      } catch (err: any) {
        if (!cancelled) {
          setEstimate(null);
          setEstimateErr(err.message || 'Could not estimate fare');
        }
      } finally {
        if (!cancelled) setEstimating(false);
      }
    };
    const t = window.setTimeout(run, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [startLocal, endLocal, carType, pickupCity]);

  const applyVehicle = (id: number | '') => {
    setSelectedVehicleId(id);
    if (id === '') return;
    const v = vehicles.find((x) => x.id === id);
    if (!v) return;
    setCarType(mapVehicleType(v.vehicle_type));
    setRegistration(v.registration_number || '');
    setMakeModel([v.make, v.model].filter(Boolean).join(' '));
  };

  const applyKnownCar = (car: KnownCar) => {
    setMakeModel(car.name);
    if (car.registration) setRegistration(car.registration);
    if (car.vehicleId) {
      const saved = vehicles.find((vehicle) => vehicle.id === car.vehicleId);
      if (saved) {
        setSelectedVehicleId(saved.id);
        setCarType(mapVehicleType(saved.vehicle_type));
        return;
      }
    }
    setSelectedVehicleId('');
  };

  const onMakeModelChange = (name: string) => {
    setMakeModel(name);
    const matches = previousCars.filter(
      (car) => car.registration && car.name.toLowerCase() === name.trim().toLowerCase()
    );
    const plates = [...new Set(matches.map((car) => car.registration))];
    if (plates.length === 1) {
      setRegistration(plates[0]);
      setSelectedVehicleId(matches[0].vehicleId || '');
    } else {
      setSelectedVehicleId('');
    }
  };

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
        const city = await cityFromCoords(latitude, longitude);
        if (city) {
          setPickupCity(city);
          setError('');
        } else {
          setError('Location saved, but the city could not be detected. Please type it.');
        }
        setLocating(false);
      },
      () => {
        setError('Could not read your location. You can still type the address.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const hoursPreview = useMemo(() => {
    const s = new Date(startLocal).getTime();
    const e = new Date(endLocal).getTime();
    if (!s || !e || e <= s) return 0;
    return (e - s) / 36e5;
  }, [startLocal, endLocal]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) {
      navigate('/auth');
      return;
    }
    if (pickupAddress.trim().length < 3) {
      setError('Enter a pickup address.');
      return;
    }
    if (pickupCity.trim().length < 2) {
      setError('Enter the city so nearby drivers can see the request.');
      return;
    }
    if (hoursPreview <= 0) {
      setError('End time must be after the start time.');
      return;
    }
    setSubmitting(true);
    try {
      const booking = await api.createDriverBooking({
        pickup_address: pickupAddress.trim(),
        pickup_city: pickupCity.trim(),
        pickup_latitude: lat,
        pickup_longitude: lng,
        drop_address: dropAddress.trim() || null,
        start_time: localToIso(startLocal),
        end_time: localToIso(endLocal),
        car_type: carType,
        transmission,
        seater,
        car_make_model: makeModel.trim() || null,
        car_registration: registration.trim() || null,
        notes: notes.trim() || null,
      });
      navigate(`/drivers/trips/${booking.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to request a driver');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <Link
            to="/drivers/trips"
            className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            My driver trips
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white py-10 px-4">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative max-w-5xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 px-3 py-1 rounded-full text-xs font-extrabold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>KYC-verified chauffeurs · OTP-secured trips</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Book an <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">Acting Driver</span> for your car
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleRequest} className="lg:col-span-7 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-black">Trip details</h2>
              <p className="text-xs text-slate-500"></p>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold px-3.5 py-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <PlaceSuggestInput
              label="Pickup address *"
              required
              value={pickupAddress}
              onChange={setPickupAddress}
              biasCity={pickupCity}
              biasLat={lat}
              biasLng={lng}
              placeholder="Building, street, landmark"
              onPick={async (place) => {
                setPickupAddress(place.subtitle && place.subtitle !== place.title ? `${place.title}, ${place.subtitle}` : place.title);
                setLat(Number(place.lat.toFixed(6)));
                setLng(Number(place.lng.toFixed(6)));
                const city = place.city || (await cityFromCoords(place.lat, place.lng));
                if (city) setPickupCity(city);
                setError('');
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-500">City *</label>
                <input
                  required
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className={inputCls}
                />
              </div>
              <PlaceSuggestInput
                label="Drop (optional)"
                value={dropAddress}
                onChange={setDropAddress}
                biasCity={pickupCity}
                biasLat={lat}
                biasLng={lng}
                placeholder="Area, street, or landmark"
                onPick={(place) => {
                  setDropAddress(place.subtitle && place.subtitle !== place.title ? `${place.title}, ${place.subtitle}` : place.title);
                }}
              />
            </div>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400"
            >
              {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
              {locating
                ? 'Detecting your city...'
                : lat && lng && pickupCity
                  ? `Using ${pickupCity}`
                  : 'Use my current location'}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-500">From *</label>
                <input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-500">To *</label>
                <input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} className={inputCls} />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {hoursPreview > 0 ? `${hoursPreview.toFixed(1)} hrs selected` : 'End must be after start'}
              {pricing ? ` · billed in ${pricing.billing_increment_minutes}-min slots, min ${pricing.min_billable_hours} hrs` : ''}
            </p>

            {vehicles.length > 0 && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-500">Saved vehicle (optional)</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => applyVehicle(e.target.value ? Number(e.target.value) : '')}
                  className={inputCls}
                >
                  <option value="">Enter car details manually</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} · {v.vehicle_type}
                      {v.make ? ` · ${v.make}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500">Car type *</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1.5">
                {CAR_TYPES.map((c) => {
                  const on = carType === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCarType(c.id)}
                      className={`p-2.5 rounded-2xl border text-left ${
                        on
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                      }`}
                    >
                      <span className="block text-[11px] font-black">{c.label}</span>
                      <span className="block text-[10px] opacity-60">{c.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500">Transmission *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['MANUAL', 'AUTOMATIC'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTransmission(t)}
                      className={`py-2.5 rounded-xl text-[11px] font-black border ${
                        transmission === t
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {t === 'MANUAL' ? 'Manual' : 'Automatic'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-500">Seater</label>
                <select value={seater} onChange={(e) => setSeater(Number(e.target.value))} className={inputCls}>
                  {SEATERS.map((n) => (
                    <option key={n} value={n}>
                      {n}-seater
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CarNameField
                value={makeModel}
                cars={previousCars}
                onNameChange={onMakeModelChange}
                onPick={applyKnownCar}
              />
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-500">Registration</label>
                <input
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                  placeholder="KA01AB1234"
                  className={`${inputCls} font-mono uppercase`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-500">Notes for the driver</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Gate code, basement parking, kids in the back…"
                className={`${inputCls} font-medium`}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : !user ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {!user
                ? 'Sign in to request a driver'
                : estimate
                ? `Request driver · ${fmtINR(estimate.total)}`
                : 'Request driver'}
              <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-center text-[10px] text-slate-400">
            </p>
          </div>
        </form>

        {/* Estimate + drivers sidebar */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 sticky top-20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-indigo-500" /> Fare estimate
              </h3>
              {estimating && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
            </div>
            {estimateErr && <p className="text-[11px] text-red-600 font-bold">{estimateErr}</p>}
            {estimate ? (
              <ul className="text-xs space-y-1.5">
                <li className="flex justify-between">
                  <span className="text-slate-500">Billable hours</span>
                  <span className="font-bold">{estimate.billable_hours} hrs</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">
                    {fmtINR(estimate.hourly_rate)} × {estimate.car_multiplier} ({estimate.car_type.toLowerCase()})
                  </span>
                  <span className="font-bold">{fmtINR(estimate.effective_hourly_rate)}/hr</span>
                </li>
                {estimate.night_hours > 0 && (
                  <li className="flex justify-between text-indigo-600 dark:text-indigo-300">
                    <span className="flex items-center gap-1">
                      <Moon className="w-3 h-3" /> Night {estimate.night_hours} hrs
                    </span>
                    <span className="font-bold">+{fmtINR(estimate.night_surcharge)}</span>
                  </li>
                )}
                <li className="flex justify-between">
                  <span className="text-slate-500">Driver fee</span>
                  <span className="font-bold">{fmtINR(estimate.driver_fee)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Platform fee ({estimate.platform_fee_percent}%)</span>
                  <span className="font-bold">{fmtINR(estimate.platform_fee)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">GST ({estimate.tax_percent}%)</span>
                  <span className="font-bold">{fmtINR(estimate.tax)}</span>
                </li>
                <li className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-base">
                  <span className="font-black">You'll pay</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-300">{fmtINR(estimate.total)}</span>
                </li>
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Pick a valid time window to see the fare.</p>
            )}
            <p className="text-[10px] text-slate-400">
            </p>
          </div>

        </aside>
      </div>
    </div>
  );
};
