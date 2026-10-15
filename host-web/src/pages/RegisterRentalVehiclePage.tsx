import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Car,
  Bike,
  Zap,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Building,
  DollarSign,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Star,
  Layers,
  KeyRound,
  Sparkles,
  AlertCircle,
  Upload,
  FileText,
  FileCheck,
  Camera,
  Trash2,
  Calendar,
  Check,
  BadgeCheck,
  TrendingUp,
  Fuel,
  Gauge,
  Users,
  Eye,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { RcVerificationResult } from '../types';

export const RegisterRentalVehiclePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Vehicle Classification State
  const [vehicleType, setVehicleType] = useState<'CAR' | 'BIKE'>('CAR');
  const [vehicleName, setVehicleName] = useState('');
  const [category, setCategory] = useState('SUV');
  const [transmission, setTransmission] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');
  const [fuelType, setFuelType] = useState<'PETROL' | 'DIESEL' | 'ELECTRIC'>('PETROL');
  const [seats, setSeats] = useState(5);
  const [mileageOrRange, setMileageOrRange] = useState('18 kmpl');
  const [yearOfMfg, setYearOfMfg] = useState('2023');

  // 2. RC Book & Documentation State (NEW)
  const [regNumber, setRegNumber] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [rcOwnershipType, setRcOwnershipType] = useState<'PRIVATE' | 'COMMERCIAL'>('PRIVATE');
  const [rcFilePreview, setRcFilePreview] = useState<string | null>(null);
  const [rcFileName, setRcFileName] = useState('');
  const [insuranceFilePreview, setInsuranceFilePreview] = useState<string | null>(null);
  const [insuranceFileName, setInsuranceFileName] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  });
  const [pucExpiry, setPucExpiry] = useState(() => {
    const nextSixMonths = new Date();
    nextSixMonths.setMonth(nextSixMonths.getMonth() + 6);
    return nextSixMonths.toISOString().split('T')[0];
  });

  // Real-Time Parivahan RC Check State (Attestr API)
  const [rcVerifying, setRcVerifying] = useState(false);
  const [rcVerifiedResult, setRcVerifiedResult] = useState<RcVerificationResult | null>(null);
  const [rcVerifyError, setRcVerifyError] = useState('');
  const [rcVerifySuccess, setRcVerifySuccess] = useState(false);

  // 3. Vehicle Photos State
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
  );
  const [customPhotoPreview, setCustomPhotoPreview] = useState<string | null>(null);

  // 4. Tariffs & Rates
  const [hourlyRate, setHourlyRate] = useState('149');
  const [dailyRate, setDailyRate] = useState('1999');
  const [securityDeposit, setSecurityDeposit] = useState('0');

  // 5. Hub Location & Handover
  const [city, setCity] = useState(user?.city || 'Bengaluru');
  const [hubAddress, setHubAddress] = useState(user?.address || '');
  const [doorstepDeliveryAvailable, setDoorstepDeliveryAvailable] = useState(true);
  const [keylessLockbox, setKeylessLockbox] = useState(true);

  // 6. Partner Details & Payout
  const [ownerName, setOwnerName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [payoutUpiId, setPayoutUpiId] = useState('');

  // Form handling state
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredVehicle, setRegisteredVehicle] = useState<any | null>(null);

  // File Input Refs
  const rcFileInputRef = useRef<HTMLInputElement | null>(null);
  const insuranceFileInputRef = useRef<HTMLInputElement | null>(null);
  const vehiclePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Handle RC Document Upload
  const handleRcUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB. Please choose a smaller image or PDF.');
      return;
    }

    setRcFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setRcFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Insurance Policy Upload
  const handleInsuranceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB.');
      return;
    }

    setInsuranceFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setInsuranceFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Custom Vehicle Photo Upload
  const handleVehiclePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomPhotoPreview(dataUrl);
      setPhotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Real-time Parivahan RC verification via Attestr API
  const handleVerifyRc = async () => {
    const trimmed = regNumber.trim();
    if (!trimmed || trimmed.length < 5) {
      setRcVerifyError('Please enter a valid registration plate number (e.g., KA01AB1234)');
      return;
    }

    setRcVerifying(true);
    setRcVerifyError('');
    setRcVerifySuccess(false);

    try {
      const result = await api.verifyRcNumber(trimmed);
      if (result.valid) {
        setRcVerifiedResult(result);
        setRcVerifySuccess(true);

        // Auto-fill form fields with certified Parivahan government data
        if (result.makerModel) {
          setVehicleName(result.makerModel);
        }
        if (result.category === '2WN') {
          setVehicleType('BIKE');
          setCategory(result.bodyType?.toUpperCase().includes('SCOOTER') ? 'SCOOTER' : 'CRUISER');
        } else if (result.category === '4WN') {
          setVehicleType('CAR');
          if (result.bodyType) {
            const bt = result.bodyType.toUpperCase();
            if (bt.includes('SUV')) setCategory('SUV');
            else if (bt.includes('SEDAN')) setCategory('SEDAN');
            else setCategory('HATCHBACK');
          }
        }
        if (result.fuelType) {
          const ft = result.fuelType.toUpperCase();
          if (ft.includes('PETROL')) setFuelType('PETROL');
          else if (ft.includes('DIESEL')) setFuelType('DIESEL');
          else if (ft.includes('ELECTRIC') || ft.includes('EV')) setFuelType('ELECTRIC');
        }
        if (result.seatingCapacity) {
          setSeats(result.seatingCapacity);
        }
        if (result.insuranceUpto) {
          setInsuranceExpiry(result.insuranceUpto);
        }
        if (result.commercial !== undefined) {
          setRcOwnershipType(result.commercial ? 'COMMERCIAL' : 'PRIVATE');
        }
        if (result.owner && (!ownerName || ownerName === user?.full_name)) {
          setOwnerName(result.owner);
        }
      } else {
        setRcVerifyError(result.message || 'Vehicle registration record not found in Parivahan registry.');
      }
    } catch (err: any) {
      setRcVerifyError(err.message || 'Failed to connect to Parivahan verification service.');
    } finally {
      setRcVerifying(false);
    }
  };

  // Preset Vehicle Models for Quick Selection
  const selectCarPreset = (name: string, cat: string, photo: string, hRate: string, dRate: string, fuel: 'PETROL' | 'DIESEL' | 'ELECTRIC') => {
    setVehicleName(name);
    setCategory(cat);
    setPhotoUrl(photo);
    setCustomPhotoPreview(null);
    setHourlyRate(hRate);
    setDailyRate(dRate);
    setFuelType(fuel);
  };

  // Submit Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleName.trim()) {
      setErrorMsg('Please enter vehicle make & model (e.g. Hyundai Creta, Mahindra Thar).');
      return;
    }
    if (!regNumber.trim()) {
      setErrorMsg('Please enter vehicle registration number (e.g. KA 01 AB 1234).');
      return;
    }
    if (!hubAddress.trim()) {
      setErrorMsg('Please specify the garage or hub pickup address.');
      return;
    }
    if (!ownerName.trim() || !phone.trim()) {
      setErrorMsg('Please provide owner contact details for renter handover.');
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('Please accept the vehicle safety and roadworthiness compliance pledge.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const result = await api.registerRentalVehicle({
        vehicleName: vehicleName.trim(),
        vehicleType,
        category,
        regNumber: regNumber.trim().toUpperCase(),
        transmission,
        fuelType,
        seats: Number(seats),
        mileageOrRange: mileageOrRange.trim(),
        hourlyRate: Number(hourlyRate),
        dailyRate: Number(dailyRate),
        securityDeposit: Number(securityDeposit),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        hubAddress: hubAddress.trim(),
        photoUrl: photoUrl.trim() || undefined,
        rcNumber: rcNumber.trim().toUpperCase() || regNumber.trim().toUpperCase(),
        rcDocumentUrl: rcFilePreview || undefined,
        rcOwnershipType,
        insurancePolicyUrl: insuranceFilePreview || undefined,
        insuranceExpiry,
        payoutUpiId: payoutUpiId.trim() || undefined,
        features: [
          'Sanitized Handover',
          'Fastag Equipped',
          'Zero Deposit Eligible',
          'Instant Keyless Unlock',
          doorstepDeliveryAvailable ? 'Doorstep Delivery Available' : 'Hub Pickup Only'
        ]
      });

      setRegisteredVehicle(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit vehicle registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Estimated Monthly Earnings Calculator (based on 22 days utilization)
  const estimatedMonthlyGross = (Number(dailyRate) || 0) * 22;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 select-none">
      
      {/* 1. Header Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3.5 shadow-xs sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/services')}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Partner Hub</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-black bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <span>🚗</span>
              <span>Self-Drive Fleet Portal</span>
            </span>
          </div>

          <Link
            to="/dashboard"
            className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hidden sm:block"
          >
            My Listings
          </Link>
        </div>
      </div>

      {/* 2. Hero Banner with Earnings Highlight */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white py-8 px-4 border-b border-amber-900/40 shadow-md">
        <div className="max-w-4xl mx-auto space-y-3.5 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 px-3 py-1 rounded-full text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>HOST VEHICLE & RC ONBOARDING</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            List Your Car or Bike for Self-Drive Rentals
          </h1>

          <p className="text-xs sm:text-sm text-amber-100/90 max-w-2xl font-medium">
            Turn your idle car or two-wheeler into an income stream. Upload your RC book, set your rates, and get verified bookings with guaranteed digital OTP handovers.
          </p>

          {/* Value Props Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 max-w-3xl">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-amber-300">₹30k - ₹75k</span>
              <span className="text-[10px] text-slate-300 font-medium">Earn per month</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-emerald-400">RC Verified</span>
              <span className="text-[10px] text-slate-300 font-medium">100% Legal & Safe</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-cyan-300">0% Deductible</span>
              <span className="text-[10px] text-slate-300 font-medium">Damage protection</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-white">Direct UPI</span>
              <span className="text-[10px] text-slate-300 font-medium">Weekly payouts</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Container */}
      <div className="max-w-4xl mx-auto px-4 mt-6">

        {registeredVehicle ? (
          /* ================= SUCCESS CONFIRMATION STATE ================= */
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-xl text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Listing Created & RC Under Verified Review
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {registeredVehicle.name} Added to Fleet!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Your vehicle RC details and photos have been submitted. Your listing is active and available for customer discovery.
              </p>
            </div>

            {/* Vehicle Passport Summary Box */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-lg mx-auto text-left space-y-3 text-xs">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <img
                  src={registeredVehicle.photo}
                  alt={registeredVehicle.name}
                  className="w-16 h-12 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm truncate">
                    {registeredVehicle.name}
                  </h4>
                  <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    Reg: {registeredVehicle.rcNumber || registeredVehicle.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black block text-sm">
                    ₹{registeredVehicle.dailyRate}/day
                  </span>
                  <span className="text-[10px] text-slate-400">₹{registeredVehicle.hourlyRate}/hr</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block font-bold">Category & Gearbox:</span>
                  <span className="font-bold">{registeredVehicle.category} ({registeredVehicle.transmission})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Hub Location:</span>
                  <span className="font-bold truncate block">{registeredVehicle.hubAddress}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">RC Verification:</span>
                  <span className="font-bold text-emerald-600 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Documents Uploaded</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Fleet Listing ID:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{registeredVehicle.id}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
              <button
                onClick={() => navigate('/services')}
                className="flex-1 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95"
              >
                Go to Partner Services Hub
              </button>
              <button
                onClick={() => {
                  setRegisteredVehicle(null);
                  setVehicleName('');
                  setRegNumber('');
                  setRcFilePreview(null);
                }}
                className="py-3.5 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition"
              >
                Add Another Vehicle
              </button>
            </div>
          </div>
        ) : (
          /* ================= STRUCTURED ONBOARDING FORM ================= */
          <form onSubmit={handleRegister} className="space-y-6">

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2.5 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-bold">{errorMsg}</span>
              </div>
            )}

            {/* CARD 1: VEHICLE CLASSIFICATION & SPECS */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Vehicle Type & Technical Specifications
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select your vehicle category and transmission details
                    </p>
                  </div>
                </div>
              </div>

              {/* Type Switcher: Car vs Two-Wheeler */}
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setVehicleType('CAR');
                    setCategory('SUV');
                    setSeats(5);
                    setHourlyRate('149');
                    setDailyRate('1999');
                    setPhotoUrl('https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80');
                  }}
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1.5 ${
                    vehicleType === 'CAR'
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold shadow-xs scale-[1.01]'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Car className="w-7 h-7" />
                  <span className="text-xs font-black block">Four-Wheeler / Car / SUV</span>
                  <span className="text-[10px] text-slate-400">Hatchbacks, Sedans & SUVs</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVehicleType('BIKE');
                    setCategory('SCOOTER');
                    setSeats(2);
                    setHourlyRate('59');
                    setDailyRate('699');
                    setPhotoUrl('https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80');
                  }}
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1.5 ${
                    vehicleType === 'BIKE'
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold shadow-xs scale-[1.01]'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Bike className="w-7 h-7" />
                  <span className="text-xs font-black block">Two-Wheeler / Scooter / Bike</span>
                  <span className="text-[10px] text-slate-400">Cruisers, Electric Scooters & Commuters</span>
                </button>
              </div>

              {/* Quick Preset Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Quick Model Presets (Click to autofill)
                </label>
                <div className="flex flex-wrap gap-2 text-xs">
                  {vehicleType === 'CAR' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => selectCarPreset('Hyundai Creta SX', 'SUV', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', '189', '2499', 'PETROL')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 font-bold transition text-[11px]"
                      >
                        Hyundai Creta (SUV)
                      </button>
                      <button
                        type="button"
                        onClick={() => selectCarPreset('Mahindra Thar 4x4', 'SUV', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80', '249', '3299', 'DIESEL')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 font-bold transition text-[11px]"
                      >
                        Mahindra Thar 4x4
                      </button>
                      <button
                        type="button"
                        onClick={() => selectCarPreset('Tata Nexon EV', 'SUV', 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80', '169', '2199', 'ELECTRIC')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 font-bold transition text-[11px]"
                      >
                        Tata Nexon EV
                      </button>
                      <button
                        type="button"
                        onClick={() => selectCarPreset('Maruti Swift AMT', 'HATCHBACK', 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80', '119', '1499', 'PETROL')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 font-bold transition text-[11px]"
                      >
                        Maruti Swift
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => selectCarPreset('Royal Enfield Hunter 350', 'CRUISER', 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80', '79', '899', 'PETROL')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 font-bold transition text-[11px]"
                      >
                        Hunter 350
                      </button>
                      <button
                        type="button"
                        onClick={() => selectCarPreset('Ather 450X EV', 'SCOOTER', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80', '59', '699', 'ELECTRIC')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 font-bold transition text-[11px]"
                      >
                        Ather 450X (EV)
                      </button>
                      <button
                        type="button"
                        onClick={() => selectCarPreset('Honda Activa 6G', 'SCOOTER', 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=800&q=80', '49', '549', 'PETROL')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 font-bold transition text-[11px]"
                      >
                        Honda Activa 6G
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vehicle Make & Model *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hyundai Creta SX(O) / Royal Enfield"
                    value={vehicleName}
                    onChange={(e) => setVehicleName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mfg Year
                  </label>
                  <input
                    type="text"
                    value={yearOfMfg}
                    onChange={(e) => setYearOfMfg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Transmission, Fuel & Seating */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Transmission
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransmission('AUTOMATIC')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        transmission === 'AUTOMATIC'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-black'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      Automatic
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransmission('MANUAL')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        transmission === 'MANUAL'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-black'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Fuel Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['PETROL', 'DIESEL', 'ELECTRIC'] as const).map((fuel) => (
                      <button
                        key={fuel}
                        type="button"
                        onClick={() => setFuelType(fuel)}
                        className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition truncate ${
                          fuelType === fuel
                            ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-black'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {fuel === 'ELECTRIC' ? 'EV' : fuel}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Seating & Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={seats}
                      onChange={(e) => setSeats(Number(e.target.value))}
                      className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    >
                      <option value={2}>2 Seats</option>
                      <option value={4}>4 Seats</option>
                      <option value={5}>5 Seats</option>
                      <option value={7}>7 Seats</option>
                    </select>
                    <input
                      type="text"
                      value={mileageOrRange}
                      onChange={(e) => setMileageOrRange(e.target.value)}
                      placeholder="18 kmpl"
                      className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: RC BOOK & LEGAL COMPLIANCE (HIGHLIGHTED) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-amber-500/40 shadow-md space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    2
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        RC Book & Document Verification
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider">
                        Mandatory
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload your Registration Certificate (RC) and insurance copy for fast-track verification
                    </p>
                  </div>
                </div>
              </div>

              {/* Registration Number with Real-time Parivahan Check & Permit Type */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Vehicle Registration Number (RC Plate) *
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Parivahan Live Check</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="e.g. KA03MG2041 or AP09CU7296"
                        value={regNumber}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setRegNumber(val);
                          setRcNumber(val);
                          setRcVerifySuccess(false);
                          setRcVerifyError('');
                        }}
                        className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-black text-sm tracking-wider text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                      {rcVerifySuccess && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">
                          <CheckCircle2 className="w-4 h-4 fill-emerald-500 text-white" />
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyRc}
                      disabled={rcVerifying || regNumber.trim().length < 5}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-black flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
                    >
                      {rcVerifying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify RC</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Demo Plates */}
                  <div className="flex items-center space-x-1.5 pt-0.5 text-[10px] text-slate-400 flex-wrap gap-y-1">
                    <span className="font-bold">Test Presets:</span>
                    {(['KA03MG2041', 'KA05NB7788', 'AP09CU7296', 'KA01AB1234'] as const).map((plate) => (
                      <button
                        key={plate}
                        type="button"
                        onClick={() => {
                          setRegNumber(plate);
                          setRcNumber(plate);
                          setRcVerifyError('');
                          // Auto-trigger verification
                          setTimeout(() => {
                            api.verifyRcNumber(plate).then((res) => {
                              if (res.valid) {
                                setRcVerifiedResult(res);
                                setRcVerifySuccess(true);
                                if (res.makerModel) setVehicleName(res.makerModel);
                                if (res.category === '2WN') setVehicleType('BIKE');
                                else setVehicleType('CAR');
                                if (res.insuranceUpto) setInsuranceExpiry(res.insuranceUpto);
                                if (res.owner) setOwnerName(res.owner);
                              }
                            });
                          }, 50);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/60 dark:hover:text-amber-300 transition"
                      >
                        {plate}
                      </button>
                    ))}
                  </div>

                  {/* Verification Error Notice */}
                  {rcVerifyError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-300 flex items-start space-x-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{rcVerifyError}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ownership & Permit Classification
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRcOwnershipType('PRIVATE')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        rcOwnershipType === 'PRIVATE'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <span className="block text-xs font-black">Private Vehicle</span>
                      <span className="text-[10px] text-slate-400 block">Personal P2P Host</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRcOwnershipType('COMMERCIAL')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        rcOwnershipType === 'COMMERCIAL'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <span className="block text-xs font-black">Self-Drive Permit</span>
                      <span className="text-[10px] text-slate-400 block">Commercial / Yellow</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* PARIVAHAN GOVERNMENT VERIFIED REPORT ACCORDION (NEW) */}
              {rcVerifiedResult && rcVerifySuccess && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-slate-900/10 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/20 border border-emerald-500/40 shadow-xs space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <span>MoRTH Parivahan Central Registry Verified</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-black">LIVE</span>
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Data verified in real-time via Ministry of Road Transport and Highways (Attestr API Suite)
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-mono font-black text-xs">
                      {rcVerifiedResult.status || 'ACTIVE'}
                    </span>
                  </div>

                  {/* Certified Details Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Owner</span>
                      <strong className="text-slate-900 dark:text-white truncate block">
                        {rcVerifiedResult.owner || 'Verified Registered Owner'}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Make & Model</span>
                      <strong className="text-slate-900 dark:text-white truncate block">
                        {rcVerifiedResult.makerModel || 'Verified Model'}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Fuel & Fitness</span>
                      <strong className="text-slate-900 dark:text-white block">
                        {rcVerifiedResult.fuelType} • Valid {rcVerifiedResult.fitnessUpto ? rcVerifiedResult.fitnessUpto.slice(0, 4) : '2035'}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Insurance Policy</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 truncate block">
                        {rcVerifiedResult.insuranceProvider ? rcVerifiedResult.insuranceProvider.slice(0, 18) : 'Active Policy'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>{rcVerifiedResult.rto || 'Regional Transport Office, Parivahan Registry'}</span>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Insurance Valid Until: {rcVerifiedResult.insuranceUpto || insuranceExpiry}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* RC Upload Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Upload Registration Certificate (RC Book) *
                </label>
                <input
                  ref={rcFileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleRcUpload}
                  className="hidden"
                />

                <div
                  onClick={() => rcFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                    rcFilePreview
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:bg-amber-50/20 dark:hover:bg-slate-800'
                  }`}
                >
                  {rcFilePreview ? (
                    <div className="space-y-2">
                      <div className="relative inline-block">
                        <img
                          src={rcFilePreview}
                          alt="RC Document"
                          className="w-36 h-24 object-cover rounded-xl border border-emerald-500 shadow-sm mx-auto"
                        />
                        <div className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white p-1 rounded-full shadow">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center space-x-1">
                          <FileCheck className="w-4 h-4" />
                          <span>RC Document Attached ({rcFileName || 'rc_book.jpg'})</span>
                        </p>
                        <p className="text-[10px] text-slate-400">Click to replace document</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Click to upload RC Book (Front & Back)
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Supports JPG, PNG, WebP, PDF (Max 10MB)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Insurance Policy & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Comprehensive Insurance Policy Copy
                  </label>
                  <input
                    ref={insuranceFileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleInsuranceUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => insuranceFileInputRef.current?.click()}
                    className="border border-slate-200 dark:border-slate-700 hover:border-amber-500 rounded-xl p-3 text-center cursor-pointer transition flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="truncate">
                        {insuranceFileName || 'Attach Policy Copy'}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-600 uppercase font-black shrink-0">
                      {insuranceFileName ? 'Replace' : 'Upload'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Insurance Expiry Date
                  </label>
                  <input
                    type="date"
                    value={insuranceExpiry}
                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* CARD 3: VEHICLE PHOTO GALLERY & PREVIEW */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Vehicle Photos & Display Preview
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Clear exterior photos help your vehicle get booked 3x faster
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Photo Upload Area */}
                <div>
                  <input
                    ref={vehiclePhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleVehiclePhotoUpload}
                    className="hidden"
                  />

                  <div
                    onClick={() => vehiclePhotoInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 bg-slate-50/50 dark:bg-slate-800/40"
                  >
                    <Camera className="w-8 h-8 text-amber-600" />
                    <div>
                      <span className="text-xs font-black block text-slate-800 dark:text-slate-200">
                        Upload Custom Vehicle Photo
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Front angle showing complete exterior
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Card Preview */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                  <div className="relative h-32 w-full">
                    <img
                      src={photoUrl}
                      alt="Vehicle Preview"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-amber-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      Customer App View
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {vehicleName || 'Vehicle Name'}
                      </span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        ₹{dailyRate}/day
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">
                      {transmission} • {fuelType} • {category}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: RENTAL TARIFFS & EARNINGS CALCULATOR */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Rental Tariffs & Security Deposit
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Set competitive rates based on vehicle category and market demand
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Rate (₹ / 24 hrs) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hourly Rate (₹ / hour) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Security Deposit (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      placeholder="0 for Zero Deposit"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-white"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                    {Number(securityDeposit) === 0 ? '✓ Zero Deposit badge enabled' : 'Refundable deposit'}
                  </span>
                </div>
              </div>

              {/* Earnings Projection Pill */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between text-white">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center space-x-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Estimated Monthly Payout</span>
                  </span>
                  <p className="text-xs text-slate-300 font-medium">
                    At 22 booked days/month (0% platform deduction for 30 days)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400 block font-mono">
                    ₹{estimatedMonthlyGross.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400">Direct to your bank</span>
                </div>
              </div>
            </div>

            {/* CARD 5: HUB LOCATION & HANDOVER */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                    5
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Hub Location & Handover Guidelines
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Where will the renter collect the vehicle and keys?
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Operating City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hub / Garage Address *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100ft Road Metro Station Hub, Indiranagar"
                    value={hubAddress}
                    onChange={(e) => setHubAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              {/* Handover Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center space-x-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doorstepDeliveryAvailable}
                    onChange={(e) => setDoorstepDeliveryAvailable(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded-md"
                  />
                  <div>
                    <span className="text-xs font-black block text-slate-800 dark:text-slate-200">
                      Doorstep Delivery Available
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Earn +₹149 extra per delivery trip
                    </span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keylessLockbox}
                    onChange={(e) => setKeylessLockbox(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded-md"
                  />
                  <div>
                    <span className="text-xs font-black block text-slate-800 dark:text-slate-200">
                      Keyless OTP Lock Handover
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Renter verifies handover via 4-digit OTP
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* CARD 6: OWNER CONTACT & UPI PAYOUT */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                    6
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Partner Information & Bank Payout
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Where would you like to receive your rental payouts?
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Owner / Fleet Name *
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payout UPI ID (e.g. name@upi)
                  </label>
                  <input
                    type="text"
                    placeholder="partner@okhdfcbank"
                    value={payoutUpiId}
                    onChange={(e) => setPayoutUpiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold font-mono"
                  />
                </div>
              </div>
            </div>

            {/* PLEDGE & SUBMIT ACTION */}
            <div className="p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-amber-600 rounded-md shrink-0"
                />
                <span className="text-xs text-slate-300 leading-relaxed font-medium">
                  I certify that the vehicle RC book, insurance, and roadworthiness are valid and authentic under the Motor Vehicles Act. I agree to ParkCo's Fleet Partner Terms of Service.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-sm shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying RC & Registering Vehicle...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    <span>Submit Vehicle & Verify RC Book</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export default RegisterRentalVehiclePage;
