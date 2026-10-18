import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getFullImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DriverPricing, DriverProfile, DriverRegistrationPayload } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  MapPin,
  LocateFixed,
  Upload,
  Camera,
  AlertCircle,
  Loader2,
  BadgeCheck,
  Clock,
  Lock,
  Contact,
  Car,
  Languages,
  Sparkles,
} from 'lucide-react';

const TRANSMISSIONS = ['Manual', 'Automatic', 'EV / Electric'];
const CAR_CATEGORIES: { id: string; label: string; hint: string }[] = [
  { id: 'HATCHBACK', label: 'Hatchback', hint: 'Swift, i20, Baleno' },
  { id: 'SEDAN', label: 'Sedan', hint: 'City, Verna, Ciaz' },
  { id: 'SUV', label: 'SUV / MUV', hint: 'Creta, XUV700, Innova' },
  { id: 'LUXURY', label: 'Luxury', hint: 'BMW, Mercedes, Audi' },
  { id: 'VAN', label: 'Van / Tempo', hint: 'Traveller, Urbania' },
];
const LANGUAGES = ['Kannada', 'English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Marathi'];
const TRIP_TYPES: { id: string; label: string; hint: string }[] = [
  { id: 'CITY', label: 'City rides', hint: 'Hourly in-city trips' },
  { id: 'NIGHT', label: 'Night safe-drop', hint: 'Parties & late returns' },
  { id: 'OUTSTATION', label: 'Outstation', hint: 'Full-day / multi-day' },
];

const STEPS = [
  { id: 1, label: 'Profile', icon: Camera },
  { id: 2, label: 'Service area', icon: MapPin },
  { id: 3, label: 'Documents', icon: Contact },
  { id: 4, label: 'Skills', icon: Car },
];

const inputCls =
  'w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60';
const labelCls = 'text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase';

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export const RegisterDriverPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [pricing, setPricing] = useState<DriverPricing | null>(null);

  // Step 1 – profile
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Step 2 – service area
  const [city, setCity] = useState(user?.city || '');
  const [serviceArea, setServiceArea] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(15);
  const [locating, setLocating] = useState(false);

  // Step 3 – documents
  const [dlNumber, setDlNumber] = useState('');
  const [dlExpiry, setDlExpiry] = useState('');
  const [dlDocUrl, setDlDocUrl] = useState('');
  const [uploadingDl, setUploadingDl] = useState(false);

  // Step 4 – skills
  const [transmissions, setTransmissions] = useState<string[]>(['Manual', 'Automatic']);
  const [categories, setCategories] = useState<string[]>(['HATCHBACK', 'SEDAN', 'SUV']);
  const [languages, setLanguages] = useState<string[]>(['Kannada', 'English', 'Hindi']);
  const [tripTypes, setTripTypes] = useState<string[]>(['CITY', 'NIGHT']);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState<DriverProfile | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const dlInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill from account + redirect existing drivers straight to their dashboard
  useEffect(() => {
    if (user) {
      setFullName((v) => v || user.full_name || '');
      setPhone((v) => v || user.phone_number || '');
      setCity((v) => v || user.city || '');
      if (!photoUrl && user.profile_photo_url && !user.profile_photo_url.startsWith('data:')) {
        setPhotoUrl(user.profile_photo_url);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    api.getDriverPricing().then(setPricing).catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setCheckingExisting(false);
      return;
    }
    let cancelled = false;
    api
      .getMyDriverProfile()
      .then((p) => {
        if (cancelled) return;
        if (p) navigate('/driver', { replace: true });
      })
      .catch(() => {})
      .finally(() => !cancelled && setCheckingExisting(false));
    return () => {
      cancelled = true;
    };
  }, [user, isLoading, navigate]);

  const uploadTo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setUrl: (u: string) => void,
    setBusy: (b: boolean) => void,
    prefix: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('File is too large. Please upload an image or PDF under 8 MB.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await api.uploadFile(file, `${prefix}_${file.name}`);
      setUrl(res.url);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      () => {
        setError('Could not read your location. You can continue without it.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (fullName.trim().length < 2) return 'Enter your full legal name (as on your licence).';
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 10) return 'Enter a valid 10-digit mobile number.';
      if (!photoUrl) return 'A clear profile photo is required so customers can recognise you.';
    }
    if (s === 2) {
      if (city.trim().length < 2) return 'Enter the city you will drive in.';
    }
    if (s === 3) {
      const dl = dlNumber.replace(/[\s-]/g, '').toUpperCase();
      if (!/^[A-Z0-9]{10,18}$/.test(dl)) return 'Driving licence number must be 10–18 letters/digits (e.g. KA0120150001234).';
      if (!dlExpiry) return 'Select the licence validity (expiry) date.';
      if (new Date(dlExpiry) <= new Date()) return 'Your driving licence appears to be expired.';
      if (!dlDocUrl) return 'Upload a photo/scan of your driving licence.';
    }
    if (s === 4) {
      if (transmissions.length === 0) return 'Select at least one transmission type you can drive.';
      if (categories.length === 0) return 'Select at least one car category.';
      if (languages.length === 0) return 'Select at least one language.';
      if (tripTypes.length === 0) return 'Select at least one trip type.';
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep((s) => Math.min(4, s + 1));
  };

  const back = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    for (let s = 1; s <= 4; s++) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setError(err);
        return;
      }
    }
    setError('');
    setSubmitting(true);
    try {
      const payload: DriverRegistrationPayload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        photo_url: photoUrl || null,
        city: city.trim(),
        service_area: serviceArea.trim() || null,
        latitude,
        longitude,
        service_radius_km: radiusKm,
        dl_number: dlNumber.replace(/[\s-]/g, '').toUpperCase(),
        dl_expiry_date: dlExpiry || null,
        dl_document_url: dlDocUrl,
        experience_years: Math.max(0, parseInt(experienceYears, 10) || 0),
        transmissions,
        vehicle_categories: categories,
        languages,
        trip_types: tripTypes,
      };
      const profile = await api.registerDriver(payload);
      setRegistered(profile);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Failed to submit driver registration');
    } finally {
      setSubmitting(false);
    }
  };

  const driverShare = pricing ? 100 - pricing.platform_fee_percent : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      {/* Header Bar */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span>Acting Driver Partner Portal</span>
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white py-10 px-4 border-b border-indigo-900 shadow-md">
        <div className="max-w-3xl mx-auto space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 px-3 py-1 rounded-full text-xs font-black">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Official Driver Partner Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Earn On Your Terms as a <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">
              ParkCo Certified Chauffeur
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl">
            Drive customers' own cars for city, night and outstation trips. Rates are fixed by ParkCo so customers always see a
            fair price — you just accept the trips you want and get paid per trip.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 max-w-2xl">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-white">
                {pricing ? `₹${Math.round(pricing.hourly_rate)}/hr` : '₹—/hr'}
              </span>
              <span className="text-[10px] text-slate-300 font-medium">Platform base rate</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-emerald-400">
                {driverShare !== null ? `${Math.round(driverShare)}%` : '—'}
              </span>
              <span className="text-[10px] text-slate-300 font-medium">Of fare goes to you</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-amber-400">
                {pricing ? `+${Math.round(pricing.night_surcharge_percent)}%` : '—'}
              </span>
              <span className="text-[10px] text-slate-300 font-medium">Night surcharge</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-cyan-300">OTP Trips</span>
              <span className="text-[10px] text-slate-300 font-medium">Safe start & end</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-8">
        {isLoading || checkingExisting ? (
          <div className="flex items-center justify-center py-16 text-xs text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
          </div>
        ) : !user ? (
          /* ================= LOGIN REQUIRED ================= */
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-indigo-200 dark:border-indigo-900 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black">Sign in to become a driver partner</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
              Your driver profile and licence are linked to your ParkCo partner account. Sign in or
              create a free partner account, then return here to register.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-2xl text-xs transition"
            >
              Sign in / Create account <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : registered ? (
          /* ================= SUCCESS VIEW ================= */
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-emerald-300 dark:border-emerald-800 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Application submitted
              </span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Documents verified — awaiting approval</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                Your driving licence passed automated KYC. A ParkCo admin will review your profile shortly; you'll be able
                to go online and accept trips as soon as it is approved.
              </p>
            </div>

            <div className="max-w-md mx-auto bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-5 border border-indigo-700/60 shadow-xl text-left space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <div>
                    <h4 className="text-xs font-black text-white">ParkCo Driver Partner ID</h4>
                    <span className="font-mono text-[10px] text-indigo-300 font-bold">REF: #DRV-{registered.id}</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Pending approval
                </span>
              </div>
              <div className="flex items-center space-x-3.5">
                {registered.photo_url ? (
                  <img
                    src={getFullImageUrl(registered.photo_url)}
                    alt={registered.full_name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-400 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-indigo-800 flex items-center justify-center text-xl"></div>
                )}
                <div>
                  <h3 className="text-base font-black text-white">{registered.full_name}</h3>
                  <p className="text-xs text-indigo-200 mt-0.5 font-mono">{registered.phone}</p>
                  <p className="text-[11px] text-indigo-300 font-bold mt-0.5">
                    {registered.city} • {registered.experience_years} yrs experience
                  </p>
                </div>
              </div>
              <div className="pt-1 border-t border-indigo-800/60">
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className={`w-4 h-4 ${registered.dl_verified ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <div>
                    <span className="text-[10px] text-indigo-300 block">Driving licence</span>
                    <span className="font-bold text-white font-mono">{registered.dl_number}</span>
                  </div>
                </div>
              </div>
              {registered.kyc_provider && (
                <p className="text-[10px] text-indigo-300/80">Verified via {registered.kyc_provider}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/driver"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-2xl text-xs transition shadow-sm"
              >
                Open Driver Dashboard
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold px-6 py-3 rounded-2xl text-xs transition"
              >
                Back to Partner Services
              </Link>
            </div>
          </div>
        ) : (
          /* ================= MULTI-STEP FORM ================= */
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Acting Driver Registration</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Provide your driving licence. It is verified automatically, then reviewed by the ParkCo team. Aadhaar is already on your partner account.
              </p>
            </div>

            {/* Stepper */}
            <ol className="grid grid-cols-4 gap-2">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const done = step > s.id;
                const active = step === s.id;
                return (
                  <li key={s.id} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition ${
                        done
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : active
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400'
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold px-3.5 py-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1 – PROFILE */}
            {step === 1 && (
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  1. Personal & contact information
                </h3>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    {photoUrl ? (
                      <img
                        src={getFullImageUrl(photoUrl)}
                        alt="Driver"
                        className="w-20 h-20 rounded-3xl object-cover border-2 border-indigo-300 dark:border-indigo-700"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center text-gray-400">
                        <Camera className="w-7 h-7" />
                      </div>
                    )}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 rounded-3xl bg-white/70 dark:bg-slate-900/70 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className={labelCls}>Profile photo *</p>
                    <p className="text-[10px] text-gray-400">Clear face photo — shown to customers after they pay.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold"
                      >
                        <Upload className="w-3.5 h-3.5" /> {photoUrl ? 'Change photo' : 'Upload photo'}
                      </button>
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={(e) => uploadTo(e, setPhotoUrl, setUploadingPhoto, 'driver_photo')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelCls}>Full legal name *</label>
                    <input
                      type="text"
                      placeholder="As printed on your driving licence"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Mobile number *</label>
                    <input
                      type="tel"
                      placeholder="+91 98450 12345"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`${inputCls} font-mono`}
                    />
                    <span className="text-[10px] text-gray-400">Shared with the customer only after they pay for the trip.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelCls}>Years of driving experience</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Account e-mail</label>
                    <input type="text" value={user.email} disabled className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 – SERVICE AREA */}
            {step === 2 && (
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  2. Where will you drive?
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 -mt-3">
                  Customers in this city will see you as available. You'll only be notified about trips that start in your city.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelCls}>Primary operating city *</label>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Home area / locality</label>
                    <input
                      type="text"
                      placeholder="e.g. Indiranagar, Koramangala"
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs font-black flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-indigo-500" /> Base location (GPS)
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {latitude !== null && longitude !== null
                          ? `Saved: ${latitude}, ${longitude}`
                          : 'Optional — helps us match you with nearby pickups first.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={useMyLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold hover:bg-indigo-50 disabled:opacity-60"
                    >
                      {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                      Use my current location
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-gray-600 dark:text-slate-300">Willing to travel for pickup</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{radiusKm} km</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={5}
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 – DOCUMENTS */}
            {step === 3 && (
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  3. Driving licence
                </h3>
                <div className="flex items-start gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-200 text-[11px] px-3.5 py-2.5 rounded-xl">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Your driving licence is checked instantly, the same way host identity documents are verified. Aadhaar from your partner sign-up is reused and is not asked again.
                  </span>
                </div>

                {/* Driving licence */}
                <div className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
                  <p className="text-xs font-black flex items-center gap-1.5">
                    <Contact className="w-4 h-4 text-indigo-500" /> Driving licence
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={labelCls}>DL number *</label>
                      <input
                        type="text"
                        placeholder="KA0120150001234"
                        value={dlNumber}
                        onChange={(e) => setDlNumber(e.target.value.toUpperCase())}
                        className={`${inputCls} font-mono uppercase text-indigo-700 dark:text-indigo-300`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Valid till *</label>
                      <input type="date" value={dlExpiry} onChange={(e) => setDlExpiry(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <DocUploadRow
                    label="Licence photo / scan *"
                    url={dlDocUrl}
                    busy={uploadingDl}
                    onPick={() => dlInputRef.current?.click()}
                  />
                  <input
                    ref={dlInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => uploadTo(e, setDlDocUrl, setUploadingDl, 'driver_dl')}
                  />
                </div>
              </div>
            )}

            {/* STEP 4 – SKILLS */}
            {step === 4 && (
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  4. Driving skills & trip preferences
                </h3>

                <ChipGroup
                  title="Transmission you can confidently drive *"
                  options={TRANSMISSIONS.map((t) => ({ id: t, label: t }))}
                  selected={transmissions}
                  onToggle={(v) => setTransmissions((l) => toggleInList(l, v))}
                />

                <div className="space-y-1.5">
                  <label className={labelCls}>Car categories *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CAR_CATEGORIES.map((c) => {
                      const on = categories.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategories((l) => toggleInList(l, c.id))}
                          className={`text-left p-3 rounded-2xl border transition ${
                            on
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <span className="block text-xs font-black">{c.label}</span>
                          <span className={`block text-[10px] ${on ? 'text-indigo-100' : 'text-gray-400'}`}>{c.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <ChipGroup
                  title="Languages spoken *"
                  icon={<Languages className="w-3.5 h-3.5" />}
                  options={LANGUAGES.map((l) => ({ id: l, label: l }))}
                  selected={languages}
                  onToggle={(v) => setLanguages((l) => toggleInList(l, v))}
                />

                <div className="space-y-1.5">
                  <label className={labelCls}>Trip types you accept *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {TRIP_TYPES.map((t) => {
                      const on = tripTypes.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTripTypes((l) => toggleInList(l, t.id))}
                          className={`text-left p-3 rounded-2xl border transition ${
                            on
                              ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200'
                              : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300'
                          }`}
                        >
                          <span className="block text-xs font-black">{on ? '✓ ' : ''}{t.label}</span>
                          <span className="block text-[10px] opacity-70">{t.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pricing (read-only, admin controlled) */}
                <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-2">
                  <p className="text-xs font-black flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> How you get paid
                  </p>
                  {pricing ? (
                    <ul className="text-[11px] text-slate-300 space-y-1">
                      <li>
                        • Base rate <b className="text-white">₹{pricing.hourly_rate}/hr</b> (×{' '}
                        {Object.entries(pricing.car_type_multipliers)
                          .map(([k, v]) => `${k.toLowerCase()} ${v}`)
                          .join(', ')}
                        ), minimum {pricing.min_billable_hours} hrs per trip.
                      </li>
                      <li>
                        • Night hours ({pricing.night_start_hour}:00–{pricing.night_end_hour}:00) earn{' '}
                        <b className="text-white">+{pricing.night_surcharge_percent}%</b>; outstation trips ₹
                        {pricing.outstation_hourly_rate}/hr (min {pricing.outstation_min_hours} hrs).
                      </li>
                      <li>
                        • ParkCo keeps a <b className="text-white">{pricing.platform_fee_percent}%</b> platform fee; the full driver
                        fee is credited to you after each completed trip.
                      </li>
                    </ul>
                  ) : (
                    <p className="text-[11px] text-slate-400">Rates are set centrally by ParkCo — you never need to quote a price.</p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={step === 1 || submitting}
                className="inline-flex items-center gap-1 px-4 py-3 rounded-2xl text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-6 py-3 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying documents…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Verify & submit application
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-center text-[10px] text-gray-400">
              By submitting you confirm the driving licence belongs to you and agree to ParkCo partner terms.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const DocUploadRow: React.FC<{ label: string; url: string; busy: boolean; onPick: () => void }> = ({
  label,
  url,
  busy,
  onPick,
}) => {
  const isPdf = url.toLowerCase().endsWith('.pdf');
  return (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed text-xs font-bold transition ${
            url
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-indigo-400'
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
            </>
          ) : url ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Uploaded — tap to replace
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Upload image or PDF
            </>
          )}
        </button>
        {url && !isPdf && (
          <img
            src={getFullImageUrl(url)}
            alt="document"
            className="w-14 h-14 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
          />
        )}
        {url && isPdf && (
          <div className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-center text-[10px] font-black text-red-600">
            PDF
          </div>
        )}
      </div>
    </div>
  );
};

const ChipGroup: React.FC<{
  title: string;
  icon?: React.ReactNode;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}> = ({ title, icon, options, selected, onToggle }) => (
  <div className="space-y-1.5">
    <label className={`${labelCls} flex items-center gap-1`}>
      {icon}
      {title}
    </label>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
              on
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-transparent hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            {on ? '✓ ' : '+ '}
            {o.label}
          </button>
        );
      })}
    </div>
  </div>
);
