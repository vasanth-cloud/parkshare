import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { VerificationStatus } from '../types';
import { HostIdentityVerificationModal } from '../components/HostIdentityVerificationModal';
import { LiveSpaceCameraCapture, CapturedPhoto, PhotoAngleKey } from '../components/LiveSpaceCameraCapture';
import { PhysicalLocationProofStep, LocationProof } from '../components/PhysicalLocationProofStep';
import { 
  MapPin, 
  Navigation, 
  ShieldAlert, 
  ShieldCheck,
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  Check,
  Loader2,
  Sparkles,
  Car,
  DollarSign,
  CheckCircle2
} from 'lucide-react';

export const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);

  // Step Wizard State (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  useEffect(() => {
    api.getVerificationStatus()
      .then(setVerificationStatus)
      .catch(console.error)
      .finally(() => setCheckingVerification(false));
  }, []);

  // Step 1: Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parkingType, setParkingType] = useState('DRIVEWAY');
  const [capacity, setCapacity] = useState<number>(1);
  const [hostType, setHostType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL');

  // Step 2: Location
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('');
  const [approxAddress, setApproxAddress] = useState('');
  const [exactAddress, setExactAddress] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');
  const [lat, setLat] = useState<number>(12.9716);
  const [lng, setLng] = useState<number>(77.5946);
  const [locationProof, setLocationProof] = useState<LocationProof | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsLocked, setGpsLocked] = useState(false);

  // Step 3: Dimensions & Features
  const [maxLengthM, setMaxLengthM] = useState<number | undefined>(5.2);
  const [maxWidthM, setMaxWidthM] = useState<number | undefined>(2.4);
  const [maxHeightM, setMaxHeightM] = useState<number | undefined>(2.1);
  const [has247Access, setHas247Access] = useState(true);
  const [hasGatedAccess, setHasGatedAccess] = useState(false);
  const [hasSecurityGuard, setHasSecurityGuard] = useState(false);
  const [isCovered, setIsCovered] = useState(false);
  const [isIndoor, setIsIndoor] = useState(false);
  const [hasCctv, setHasCctv] = useState(false);
  const [hasEv, setHasEv] = useState(false);
  const [parkingRules, setParkingRules] = useState('Reverse entry preferred. No engine idling after 10 PM. Park strictly within marked bay.');

  // Step 4: Pricing Plans
  const [hourlyPrice, setHourlyPrice] = useState<number>(40);
  const [dailyPrice, setDailyPrice] = useState<number>(250);
  const [multiDayDiscountPercent, setMultiDayDiscountPercent] = useState<number>(15);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(3500);
  const [monthlyCommuterPrice, setMonthlyCommuterPrice] = useState<number>(2200);

  // Step 5: Live Photos
  const [photos, setPhotos] = useState<Partial<Record<PhotoAngleKey, CapturedPhoto>>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Robust GPS detector with high-accuracy + network fallback
  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    setError('');

    const onGpsSuccess = async (pos: GeolocationPosition) => {
      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;
      setLat(latitude);
      setLng(longitude);
      setGpsLocked(true);

      // Default fallback area & city from coordinates if empty
      if (!city) setCity('Bengaluru');
      if (!area) setArea('Indiranagar');
      if (!approxAddress) setApproxAddress(`Near GPS Pin (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      if (!exactAddress) setExactAddress(`GPS Pin: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);

      // Try reverse geocoding with 4-second timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const detectedCity = data.address.city || data.address.town || data.address.state_district || 'Bengaluru';
            const detectedArea = data.address.suburb || data.address.neighbourhood || data.address.residential || '';
            const detectedPostcode = data.address.postcode || '';
            if (detectedCity) setCity(detectedCity);
            if (detectedArea) setArea(detectedArea);
            if (detectedPostcode) setPincode(detectedPostcode);
            if (data.display_name) {
              setApproxAddress(data.display_name.split(',').slice(0, 3).join(','));
              setExactAddress(data.display_name);
            }
          }
        }
      } catch (e) {
        console.warn('Reverse geocode fallback used coordinates', e);
      } finally {
        setDetectingGps(false);
      }
    };

    const onGpsError = (err: GeolocationPositionError) => {
      console.warn('High-accuracy GPS timeout/error, trying standard accuracy:', err);
      navigator.geolocation.getCurrentPosition(
        onGpsSuccess,
        (secondErr) => {
          setDetectingGps(false);
          alert('GPS location unavailable: ' + secondErr.message + '. Please ensure location permission is allowed.');
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      onGpsSuccess,
      onGpsError,
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );
  };

  const geocodeTypedAddress = async (queryStr?: string) => {
    const query = queryStr || exactAddress || `${area}, ${city}`;
    if (!query || query.length < 3) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat));
        setLng(parseFloat(data[0].lon));
        setGpsLocked(true);
      }
    } catch (e) {
      console.error('Forward geocoding error', e);
    }
  };

  // Step Validation
  const validateStep = (step: number): boolean => {
    setError('');

    if (step === 1) {
      if (!title.trim() || title.trim().length < 3) {
        setError('Please enter a space title (at least 3 characters).');
        return false;
      }
      if (capacity < 1) {
        setError('Slot capacity must be at least 1.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!city.trim() || !area.trim()) {
        setError('Please fill in both City and Area.');
        return false;
      }
      if (!approxAddress.trim()) {
        setError('Please enter the area display address.');
        return false;
      }
      if (!locationProof || !locationProof.is_location_verified) {
        setError("Physical location proof required: Please tap 'Verify On-Site' below before proceeding.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      return true;
    }

    if (step === 4) {
      if (!hourlyPrice || hourlyPrice <= 0) {
        setError('Hourly rate must be greater than ₹0.');
        return false;
      }
      if (!dailyPrice || dailyPrice <= 0) {
        setError('Daily rate must be greater than ₹0.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (verificationStatus && !verificationStatus.can_submit_space) {
      setError('Host Identity Verification required before submitting a parking space.');
      setIsVerificationModalOpen(true);
      return;
    }

    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    if (!photos.ENTRANCE?.url) {
      setError("Please capture 'Road Entrance' photo.");
      return;
    }
    if (!photos.PARKING_SLOT?.url) {
      setError("Please capture 'Parking Slot' photo.");
      return;
    }
    if (!photos.SURROUNDINGS?.url) {
      setError("Please capture 'Surroundings' photo.");
      return;
    }

    const isCoveredSpace = isCovered || isIndoor || parkingType === 'COVERED_PARKING' || parkingType === 'GARAGE';
    if (isCoveredSpace && !photos.ROOF_CLEARANCE?.url) {
      setError("For covered/indoor parking, photo of 'Roof Clearance' is required.");
      return;
    }

    if (hasGatedAccess && !photos.GATE_ENTRY?.url) {
      setError("For gated parking, photo of 'Gate / Barrier' is required.");
      return;
    }

    // Build verified images payload
    const imagesPayload: { image_url: string; caption: string; is_cover: boolean; display_order: number }[] = [];
    if (photos.PARKING_SLOT) {
      imagesPayload.push({
        image_url: photos.PARKING_SLOT.url,
        caption: 'PARKING_SLOT',
        is_cover: true,
        display_order: 1,
      });
    }
    if (photos.ENTRANCE) {
      imagesPayload.push({
        image_url: photos.ENTRANCE.url,
        caption: 'ENTRANCE',
        is_cover: false,
        display_order: 2,
      });
    }
    if (photos.SURROUNDINGS) {
      imagesPayload.push({
        image_url: photos.SURROUNDINGS.url,
        caption: 'SURROUNDINGS',
        is_cover: false,
        display_order: 3,
      });
    }
    if (photos.ROOF_CLEARANCE) {
      imagesPayload.push({
        image_url: photos.ROOF_CLEARANCE.url,
        caption: 'ROOF_CLEARANCE',
        is_cover: false,
        display_order: 4,
      });
    }
    if (photos.GATE_ENTRY) {
      imagesPayload.push({
        image_url: photos.GATE_ENTRY.url,
        caption: 'GATE_ENTRY',
        is_cover: false,
        display_order: 5,
      });
    }

    setLoading(true);
    setError('');

    try {
      await api.createListing({
        title,
        description,
        host_type: hostType,
        parking_type: parkingType,
        area,
        city,
        state,
        pincode: pincode || '560001',
        approximate_address: approxAddress,
        exact_address: exactAddress || approxAddress,
        access_instructions: accessInstructions || 'Gate code shared upon confirmation.',
        latitude: lat,
        longitude: lng,
        capacity,
        total_spaces: capacity,
        max_length_m: maxLengthM,
        max_width_m: maxWidthM,
        max_height_m: maxHeightM,
        is_covered: isCovered,
        is_indoor: isIndoor,
        has_cctv: hasCctv,
        has_ev_charging: hasEv,
        has_24_7_access: has247Access,
        has_gated_access: hasGatedAccess,
        has_security_guard: hasSecurityGuard,
        allowed_vehicle_types: ['CAR', 'SUV', 'BIKE'],
        parking_rules: parkingRules,
        booking_mode: 'INSTANT',
        pricing_rule: {
          hourly_price: hourlyPrice,
          daily_price: dailyPrice,
          multi_day_discount_percent: multiDayDiscountPercent,
          monthly_price: monthlyPrice,
          monthly_commuter_price: monthlyCommuterPrice,
          minimum_duration_hours: 1,
          maximum_duration_hours: 720,
          security_deposit: 0,
        },
        images: imagesPayload,
        location_verification: locationProof,
      });

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create space listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-slate-50 to-gray-100 py-4 px-3.5 sm:px-6 lg:px-8 max-w-lg mx-auto space-y-3.5 pb-28">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Host Space
          </span>
          <h1 className="text-xl font-black text-gray-900 tracking-tight mt-0.5">
            Add Parking Space
          </h1>
        </div>
        <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-xl shadow-2xs">
          Step {currentStep} / 5
        </span>
      </div>

      {/* Clean Numbered Step Indicator (1, 2, 3, 4, 5) */}
      <div className="bg-white rounded-2xl p-2 border border-gray-200/80 shadow-2xs">
        <div className="flex items-center justify-between max-w-xs mx-auto px-2">
          {[1, 2, 3, 4, 5].map((stepNum, idx) => {
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            return (
              <React.Fragment key={stepNum}>
                <button
                  type="button"
                  onClick={() => {
                    if (stepNum < currentStep) setCurrentStep(stepNum);
                  }}
                  disabled={stepNum > currentStep}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-3 ring-emerald-100 scale-105'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? '✓' : stepNum}
                </button>
                {idx < 4 && (
                  <div
                    className={`flex-1 h-1 mx-1.5 rounded-full transition-all ${
                      currentStep > stepNum ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold border border-red-200 shadow-2xs">
          {error}
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-gray-200/80 space-y-3.5">
        
        {/* ===================== STEP 1: BASICS ===================== */}
        {currentStep === 1 && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Host Category in SAME LINE */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Host Category *</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setHostType('INDIVIDUAL')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    hostType === 'INDIVIDUAL'
                      ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>🏡</span>
                  <span className="truncate">Individual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHostType('BUSINESS')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    hostType === 'BUSINESS'
                      ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>🏢</span>
                  <span className="truncate">Commercial</span>
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Space Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Driveway Parking near 100ft Road"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Parking Type & Capacity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Parking Type *</label>
                <select
                  value={parkingType}
                  onChange={(e) => setParkingType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="DRIVEWAY">Private Driveway</option>
                  <option value="GARAGE">Covered Garage</option>
                  <option value="APARTMENT_PARKING">Apartment Slot</option>
                  <option value="OPEN_LOT">Open Gated Lot</option>
                  <option value="COMMERCIAL_PARKING">Shop Bay</option>
                  <option value="PRIVATE_PARKING">Dedicated Bay</option>
                  <option value="OTHER">Other Space</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Spaces (Capacity) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="1"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description (Optional)</label>
              <textarea
                rows={2}
                placeholder="Landmark details, entry access, gate color..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ===================== STEP 2: LOCATION ===================== */}
        {currentStep === 2 && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* GPS Detection Bar */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-xs text-gray-700 font-medium truncate">
                  {gpsLocked ? (
                    <strong className="text-emerald-800">✓ GPS Pin: {lat.toFixed(4)}, {lng.toFixed(4)}</strong>
                  ) : (
                    'Pin location via GPS or address'
                  )}
                </span>
              </div>
              <button
                type="button"
                disabled={detectingGps}
                onClick={detectLocation}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white border border-emerald-300 px-2.5 py-1 rounded-lg transition flex items-center space-x-1 shadow-2xs flex-shrink-0 cursor-pointer disabled:opacity-50"
              >
                {detectingGps ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{detectingGps ? 'Locating...' : 'Detect GPS'}</span>
              </button>
            </div>

            {/* City & Area in Same Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">City *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Area / Locality *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indiranagar"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Public Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Area / Public Address *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Near 100ft Road, Indiranagar"
                value={approxAddress}
                onChange={(e) => setApproxAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Exact Address */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  Exact Address (Shared after booking)
                </label>
                <button
                  type="button"
                  onClick={() => geocodeTypedAddress()}
                  className="text-[11px] font-bold text-emerald-700 underline"
                >
                  Sync Pin
                </button>
              </div>
              <input
                type="text"
                placeholder="House / Building #, Cross, Landmark"
                value={exactAddress}
                onChange={(e) => setExactAddress(e.target.value)}
                onBlur={() => geocodeTypedAddress()}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Compact Physical Location Proof */}
            <div className="pt-1">
              <PhysicalLocationProofStep
                declaredLat={lat}
                declaredLng={lng}
                declaredAddress={exactAddress || approxAddress}
                verificationData={locationProof}
                onVerificationChange={setLocationProof}
              />
            </div>
          </div>
        )}

        {/* ===================== STEP 3: CLEARANCE & FEATURES ===================== */}
        {currentStep === 3 && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Dimensions */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Clearance Limits (Meters)</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-gray-500 block mb-0.5">Length</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="5.2"
                    value={maxLengthM || ''}
                    onChange={(e) => setMaxLengthM(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block mb-0.5">Width</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="2.4"
                    value={maxWidthM || ''}
                    onChange={(e) => setMaxWidthM(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block mb-0.5">Height</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="2.1"
                    value={maxHeightM || ''}
                    onChange={(e) => setMaxHeightM(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Amenities Grid */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amenities</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-700">
                <label className={`p-2 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${has247Access ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-gray-50 border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={has247Access}
                    onChange={(e) => setHas247Access(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>24/7 Access</span>
                </label>

                <label className={`p-2 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${hasGatedAccess ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-gray-50 border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={hasGatedAccess}
                    onChange={(e) => setHasGatedAccess(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Gated Entry</span>
                </label>

                <label className={`p-2 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${isCovered ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-gray-50 border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={isCovered}
                    onChange={(e) => setIsCovered(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Covered Roof</span>
                </label>

                <label className={`p-2 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${hasCctv ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-gray-50 border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={hasCctv}
                    onChange={(e) => setHasCctv(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>24/7 CCTV</span>
                </label>

                <label className={`p-2 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${hasEv ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-gray-50 border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={hasEv}
                    onChange={(e) => setHasEv(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>EV Charger</span>
                </label>

                <label className={`p-2 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${hasSecurityGuard ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-gray-50 border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={hasSecurityGuard}
                    onChange={(e) => setHasSecurityGuard(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Security Guard</span>
                </label>
              </div>
            </div>

            {/* Parking Rules */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">House Rules (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Reverse entry preferred. No loud engine idling."
                value={parkingRules}
                onChange={(e) => setParkingRules(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ===================== STEP 4: PRICING ===================== */}
        {currentStep === 4 && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Hourly & Daily */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <label className="block text-xs font-bold text-emerald-950 uppercase mb-1">Hourly (₹) *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-sm font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={hourlyPrice}
                    onChange={(e) => setHourlyPrice(Number(e.target.value))}
                    className="w-full pl-6 pr-2 py-1.5 border border-emerald-200 bg-white rounded-lg text-sm font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <label className="block text-xs font-bold text-emerald-950 uppercase mb-1">Daily (₹) *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-sm font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={dailyPrice}
                    onChange={(e) => setDailyPrice(Number(e.target.value))}
                    className="w-full pl-6 pr-2 py-1.5 border border-emerald-200 bg-white rounded-lg text-sm font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Monthly & Discounts */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Monthly (₹)</label>
                <input
                  type="number"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Multi-day Discount %</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={multiDayDiscountPercent}
                  onChange={(e) => setMultiDayDiscountPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================== STEP 5: PHOTOS (UNCONGESTED) ===================== */}
        {currentStep === 5 && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Space Photos *
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Capture live photos on-site: Entrance, Slot, and Surroundings.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Live Camera Only
              </span>
            </div>

            <LiveSpaceCameraCapture
              photos={photos}
              onPhotosChange={setPhotos}
              isCovered={isCovered}
              isIndoor={isIndoor}
              parkingType={parkingType}
              hasGatedAccess={hasGatedAccess}
              currentLat={lat}
              currentLng={lng}
            />
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-3.5 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-xs cursor-pointer ml-auto"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            verificationStatus && !verificationStatus.can_submit_space ? (
              <Link
                to="/verification"
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5 ml-auto"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Verify KYC to Submit</span>
              </Link>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center space-x-1.5 ml-auto cursor-pointer"
              >
                <span>{loading ? 'Submitting...' : 'Submit Space'}</span>
                <Check className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>

      </form>

      {/* ===================== ATTRACTIVE CONTEXTUAL HOST TIP CARD (Fills empty void) ===================== */}
      {currentStep === 1 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50/40 rounded-2xl p-3.5 border border-emerald-200/80 shadow-2xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Host Listing Tip</span>
          </div>
          <p className="text-[11px] text-emerald-900 leading-relaxed">
            Spaces with landmark titles like <em>"Safe Driveway near Metro"</em> get up to <strong>3x more driver bookings</strong>.
          </p>
          <div className="pt-1.5 border-t border-emerald-200/60 flex items-center justify-between text-[10px] text-emerald-800 font-semibold">
            <span>🛡️ Host Property Protection</span>
            <span className="bg-emerald-100/90 text-emerald-900 px-2 py-0.5 rounded-md font-bold">₹50,000 Cover</span>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="bg-gradient-to-r from-blue-50 via-cyan-50/70 to-blue-50/40 rounded-2xl p-3.5 border border-blue-200/80 shadow-2xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-blue-950 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>Privacy & Address Protection</span>
          </div>
          <p className="text-[11px] text-blue-900 leading-relaxed">
            Your exact house number is <strong>never displayed publicly</strong> on maps. Drivers receive arrival directions only after payment is confirmed.
          </p>
          <div className="pt-1.5 border-t border-blue-200/60 flex items-center justify-between text-[10px] text-blue-800 font-semibold">
            <span>📍 High-Accuracy Pin</span>
            <span className="text-blue-700">Turn-by-turn Driver GPS</span>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50/40 rounded-2xl p-3.5 border border-purple-200/80 shadow-2xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-purple-950 font-bold text-xs">
            <Car className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>Clearance Guide</span>
          </div>
          <p className="text-[11px] text-purple-900 leading-relaxed">
            Standard hatchbacks require ~4.0m, sedans ~4.6m, and large SUVs (like Fortuner or Safari) need 5.0m+ with at least 2.1m height clearance.
          </p>
          <div className="pt-1.5 border-t border-purple-200/60 flex items-center justify-between text-[10px] text-purple-800 font-semibold">
            <span>⚡ EV Charger Bonus</span>
            <span className="text-purple-700">+25% Higher Hourly Earnings</span>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50/40 rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-amber-950 font-bold text-xs">
            <DollarSign className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Weekly Host Payouts</span>
          </div>
          <p className="text-[11px] text-amber-900 leading-relaxed">
            Hosts in your area earn an average of <strong>₹8,000 – ₹15,000/month</strong>. Payouts are transferred automatically to your registered UPI ID every week.
          </p>
          <div className="pt-1.5 border-t border-amber-200/60 flex items-center justify-between text-[10px] text-amber-800 font-semibold">
            <span>⚡ Automated UPI Settlement</span>
            <span className="text-amber-800 font-bold">Zero Withdrawal Fees</span>
          </div>
        </div>
      )}

      {currentStep === 5 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50/40 rounded-2xl p-3.5 border border-emerald-200/80 shadow-2xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Fast-Track Admin Approval</span>
          </div>
          <p className="text-[11px] text-emerald-900 leading-relaxed">
            Spaces with clear photos of the entrance and slot are approved in under <strong>15 minutes</strong> and become instantly searchable on the driver app.
          </p>
          <div className="pt-1.5 border-t border-emerald-200/60 flex items-center justify-between text-[10px] text-emerald-800 font-semibold">
            <span>🛡️ Official Verified Host Badge</span>
            <span className="text-emerald-700 font-bold">Unlocks Instant Bookings</span>
          </div>
        </div>
      )}

      <HostIdentityVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onSuccess={(status) => {
          setVerificationStatus(status);
          setError('');
        }}
      />
    </div>
  );
};
