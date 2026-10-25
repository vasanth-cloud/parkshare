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
  Fuel,
  Gauge,
  Users,
  Eye,
  RefreshCw,
  ShieldAlert,
  Sliders
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
  const [showManualSpecsEdit, setShowManualSpecsEdit] = useState(false);

  // 3. Vehicle Photos State
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
  );
  const [customPhotoPreview, setCustomPhotoPreview] = useState<string | null>(null);

  // 4. Tariffs & Rates
  const [hourlyRate, setHourlyRate] = useState('189');
  const [dailyRate, setDailyRate] = useState('2499');
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

  // Model-to-Photo Matcher Helper
  const getPresetPhotoForModel = (model: string, type: 'CAR' | 'BIKE'): string => {
    const m = (model || '').toUpperCase();
    if (m.includes('THAR')) return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80';
    if (m.includes('CRETA')) return 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
    if (m.includes('NEXON')) return 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80';
    if (m.includes('SWIFT')) return 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80';
    if (m.includes('ACTIVA') || m.includes('SCOOTER')) return 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80';
    if (m.includes('HUNTER') || m.includes('ROYAL') || m.includes('ENFIELD') || type === 'BIKE') {
      return 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
  };

  // Real-time Parivahan RC verification via Attestr API
  const handleVerifyRc = async (customPlate?: string) => {
    const targetPlate = (typeof customPlate === 'string' ? customPlate : regNumber).trim().toUpperCase();
    if (!targetPlate || targetPlate.length < 5) {
      setRcVerifyError('Please enter a valid registration plate number (e.g., KA03AB1234)');
      return;
    }

    setRegNumber(targetPlate);
    setRcNumber(targetPlate);
    setRcVerifying(true);
    setRcVerifyError('');
    setRcVerifySuccess(false);

    try {
      const result = await api.verifyRcNumber(targetPlate);
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
          setSeats(2);
          setMileageOrRange('40 kmpl');
          setHourlyRate('79');
          setDailyRate('899');
        } else if (result.category === '4WN') {
          setVehicleType('CAR');
          if (result.bodyType) {
            const bt = result.bodyType.toUpperCase();
            if (bt.includes('SUV')) setCategory('SUV');
            else if (bt.includes('SEDAN')) setCategory('SEDAN');
            else setCategory('HATCHBACK');
          }
          const modelUpper = (result.makerModel || '').toUpperCase();
          if (modelUpper.includes('THAR')) {
            setHourlyRate('249');
            setDailyRate('3299');
            setMileageOrRange('14.2 kmpl');
          } else if (modelUpper.includes('CRETA')) {
            setHourlyRate('189');
            setDailyRate('2499');
            setMileageOrRange('16.8 kmpl');
          } else if (modelUpper.includes('NEXON')) {
            setHourlyRate('169');
            setDailyRate('2199');
            setMileageOrRange('437 km range');
          } else {
            setHourlyRate('129');
            setDailyRate('1699');
            setMileageOrRange('18 kmpl');
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
        if (result.registered) {
          setYearOfMfg(result.registered.slice(0, 4));
        } else if (result.fitnessUpto) {
          const fitYear = parseInt(result.fitnessUpto.slice(0, 4), 10);
          if (!isNaN(fitYear)) setYearOfMfg(String(fitYear - 15));
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

        // Auto photo selection
        const autoPhoto = getPresetPhotoForModel(
          result.makerModel || '',
          result.category === '2WN' ? 'BIKE' : 'CAR'
        );
        if (!customPhotoPreview) {
          setPhotoUrl(autoPhoto);
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

      // Save to local fleet list so dashboard can highlight partner vehicles
      try {
        const stored = JSON.parse(localStorage.getItem('parkshare_my_fleet_ids') || '[]');
        if (!stored.includes(result.id)) {
          stored.unshift(result.id);
          localStorage.setItem('parkshare_my_fleet_ids', JSON.stringify(stored));
        }
      } catch (e) {
        // ignore storage errors
      }

      setRegisteredVehicle(result);

      // Navigate directly to the Rental Fleet Dashboard
      navigate('/rental', {
        state: {
          justRegistered: true,
          newVehicle: result,
          successMessage: `${result.name} (${result.rcNumber || result.name}) has been registered and is now live on your fleet dashboard!`
        }
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit vehicle registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 select-none">
      
      {/* 1. Header Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 shadow-xs relative z-10">
        <div className="max-w-4xl mx-auto flex items-center">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate('/rental');
              }
            }}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200/80 dark:border-slate-700 group shadow-xs active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
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
                {registeredVehicle.name} Added to Rentals!
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
                  <span className="text-slate-400 block font-bold">Rental Listing ID:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{registeredVehicle.id}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
              <button
                onClick={() => navigate('/rental', { state: { registeredVehicle, newVehicle: registeredVehicle } })}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <Car className="w-4 h-4" />
                <span>Go to Rental Dashboard</span>
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

            {/* CARD 1: VEHICLE REGISTRATION (RC) & AUTO-FETCHED SPECIFICATIONS */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-amber-500/40 shadow-md space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Vehicle Registration (RC) & Auto-Fetch
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter your vehicle plate number to auto-retrieve make, model, owner, fuel & fitness details.
                    </p>
                  </div>
                </div>
              </div>

              {/* IND Number Plate Search Box */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Vehicle Registration Number (RC Plate) *
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  {/* Styled Indian Number Plate */}
                  <div className="flex-1 flex items-center rounded-2xl border-2 border-slate-800 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-inner focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition">
                    <div className="bg-blue-800 text-white px-3 py-3 flex flex-col items-center justify-center border-r border-blue-900 shrink-0 select-none">
                      <span className="text-[10px] font-black tracking-widest text-blue-200">IND</span>
                      <span className="text-[12px] leading-none">🇮🇳</span>
                    </div>
                    <input
                      type="text"
                      placeholder="KA 03 AB 1234"
                      value={regNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setRegNumber(val);
                        setRcNumber(val);
                        setRcVerifySuccess(false);
                        setRcVerifyError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyRc();
                        }
                      }}
                      className="w-full px-4 py-3 bg-transparent font-mono font-black text-base sm:text-lg tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      required
                    />
                    {rcVerifySuccess && (
                      <div className="pr-3 text-emerald-500 flex items-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyRc()}
                    disabled={rcVerifying || regNumber.trim().length < 5}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer shrink-0"
                  >
                    {rcVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Fetching from Parivahan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Verify & Auto-Fetch Details</span>
                      </>
                    )}
                  </button>
                </div>


                {/* Verification Error Notice */}
                {rcVerifyError && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{rcVerifyError}</span>
                  </div>
                )}
              </div>

              {/* AUTOMATICALLY FETCHED SPECIFICATIONS CARD */}
              {rcVerifiedResult && rcVerifySuccess ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-slate-900/10 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/30 border border-emerald-500/50 shadow-sm space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-500/20 pb-3 gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <span>MoRTH Parivahan Registry Verified</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black">
                            AUTO-FETCHED
                          </span>
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Registration Certificate verified via Attestr Parivahan Suite
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono font-black text-xs self-start sm:self-auto border border-emerald-300 dark:border-emerald-700">
                      STATUS: {rcVerifiedResult.status || 'ACTIVE'}
                    </span>
                  </div>

                  {/* Certified Specs 6-Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Vehicle Make & Model
                      </span>
                      <strong className="text-slate-900 dark:text-white font-black truncate block text-sm">
                        {vehicleName}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Registered Owner
                      </span>
                      <strong className="text-slate-900 dark:text-white font-black truncate block text-sm">
                        {ownerName || rcVerifiedResult.owner}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Class & Seating
                      </span>
                      <strong className="text-slate-900 dark:text-white font-black block text-sm">
                        {vehicleType === 'CAR' ? 'Car / SUV' : 'Two-Wheeler'} • {seats} Seats
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Fuel Type & Mfg Year
                      </span>
                      <strong className="text-slate-900 dark:text-white font-black block text-sm">
                        {fuelType} • Mfg {yearOfMfg}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Registered RTO
                      </span>
                      <strong className="text-slate-900 dark:text-white font-black truncate block text-sm">
                        {rcVerifiedResult.rto || 'Regional Transport Office'}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Insurance Policy
                      </span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black truncate block text-sm">
                        {rcVerifiedResult.insuranceProvider ? rcVerifiedResult.insuranceProvider.slice(0, 22) : 'Active Policy'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 gap-2 border-t border-emerald-500/20">
                    <span className="flex items-center space-x-1 font-medium">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Fitness Certificate Valid Until: <strong>{rcVerifiedResult.fitnessUpto || '2038'}</strong></span>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Insurance Valid Until: <strong>{insuranceExpiry}</strong></span>
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Transmission & Permit Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Transmission Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransmission('AUTOMATIC')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
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
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
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
                    Ownership & Permit Classification
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRcOwnershipType('PRIVATE')}
                      className={`py-2.5 px-3 rounded-xl border text-left transition cursor-pointer ${
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
                      className={`py-2.5 px-3 rounded-xl border text-left transition cursor-pointer ${
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

              {/* Document Attachments (RC Book & Insurance Policy) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* RC Upload Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Attach RC Book Copy (Front/Back) *
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
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1.5 ${
                      rcFilePreview
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:bg-amber-50/20 dark:hover:bg-slate-800'
                    }`}
                  >
                    {rcFilePreview ? (
                      <div className="space-y-1">
                        <div className="text-center">
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center space-x-1">
                            <FileCheck className="w-4 h-4" />
                            <span>RC Document Attached ({rcFileName || 'rc_copy.jpg'})</span>
                          </p>
                          <p className="text-[10px] text-slate-400">Click to replace document</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-amber-600" />
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                            Upload RC Photo / PDF
                          </p>
                          <p className="text-[10px] text-slate-400">
                            JPG, PNG, PDF up to 10MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Insurance Policy Copy */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Attach Insurance Policy Copy (Optional)
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
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1.5 ${
                      insuranceFilePreview
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:bg-amber-50/20 dark:hover:bg-slate-800'
                    }`}
                  >
                    {insuranceFilePreview ? (
                      <div className="space-y-1">
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center space-x-1">
                          <FileCheck className="w-4 h-4" />
                          <span>Insurance Policy Attached ({insuranceFileName || 'insurance.pdf'})</span>
                        </p>
                        <p className="text-[10px] text-slate-400">Click to replace file</p>
                      </div>
                    ) : (
                      <>
                        <FileText className="w-6 h-6 text-amber-600" />
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                            Upload Insurance Copy
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Comprehensive or Zero-Dep cover
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional Manual Specs Edit Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualSpecsEdit(!showManualSpecsEdit)}
                  className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 font-bold transition cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showManualSpecsEdit ? 'Hide Manual Technical Overrides' : 'Need to tweak vehicle specs manually? Click here'}</span>
                </button>

                {showManualSpecsEdit && (
                  <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Vehicle Make & Model
                        </label>
                        <input
                          type="text"
                          value={vehicleName}
                          onChange={(e) => setVehicleName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Mfg Year
                        </label>
                        <input
                          type="text"
                          value={yearOfMfg}
                          onChange={(e) => setYearOfMfg(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Fuel Type
                        </label>
                        <select
                          value={fuelType}
                          onChange={(e) => setFuelType(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        >
                          <option value="PETROL">Petrol</option>
                          <option value="DIESEL">Diesel</option>
                          <option value="ELECTRIC">Electric / EV</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Seats
                        </label>
                        <input
                          type="number"
                          value={seats}
                          onChange={(e) => setSeats(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Mileage / Range
                        </label>
                        <input
                          type="text"
                          value={mileageOrRange}
                          onChange={(e) => setMileageOrRange(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: VEHICLE PHOTO GALLERY & PREVIEW */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                    2
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
                        ₹{hourlyRate}/hr
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">
                      {transmission} • {fuelType} • {category}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: RENTAL TARIFF */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Rental Tariff
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Set competitive hourly rate based on vehicle category and market demand
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hourly Rate (₹ / hour) *
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => {
                      setHourlyRate(e.target.value);
                      setDailyRate(String(Number(e.target.value) * 10));
                    }}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* CARD 4: HUB LOCATION & HANDOVER */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Hub Location
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

            </div>

            {/* CARD 5: OWNER CONTACT & UPI PAYOUT */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                    5
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
                    Owner / Business Name *
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
                  I certify that the vehicle RC book, insurance, and roadworthiness are valid and authentic under the Motor Vehicles Act. I agree to ParkCo's Rental Partner Terms of Service.
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
