import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { VerificationStatus } from '../types';
import { HostIdentityVerificationModal } from '../components/HostIdentityVerificationModal';
import { LiveSpaceCameraCapture, CapturedPhoto, PhotoAngleKey } from '../components/LiveSpaceCameraCapture';
import { PhysicalLocationProofStep, LocationProof } from '../components/PhysicalLocationProofStep';
import { MapPin, Plus, Navigation, ShieldCheck, ShieldAlert, CheckCircle2, Lock, Camera } from 'lucide-react';

export const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);

  useEffect(() => {
    api.getVerificationStatus()
      .then(setVerificationStatus)
      .catch(console.error)
      .finally(() => setCheckingVerification(false));
  }, []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parkingType, setParkingType] = useState('DRIVEWAY');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('');
  const [approxAddress, setApproxAddress] = useState('');
  const [exactAddress, setExactAddress] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');
  const [lat, setLat] = useState<number>(12.9716);
  const [lng, setLng] = useState<number>(77.5946);
  const [capacity, setCapacity] = useState<number>(1);
  const [hostType, setHostType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL');

  // Pricing Plans
  const [hourlyPrice, setHourlyPrice] = useState<number>(40);
  const [dailyPrice, setDailyPrice] = useState<number>(250);
  const [multiDayDiscountPercent, setMultiDayDiscountPercent] = useState<number>(15);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(3500);
  const [monthlyCommuterPrice, setMonthlyCommuterPrice] = useState<number>(2200);

  // Features
  const [isCovered, setIsCovered] = useState(false);
  const [isIndoor, setIsIndoor] = useState(false);
  const [hasCctv, setHasCctv] = useState(false);
  const [hasEv, setHasEv] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<PhotoAngleKey, CapturedPhoto>>>({});
  const [locationProof, setLocationProof] = useState<LocationProof | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          setLat(latitude);
          setLng(longitude);

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();
            if (data && data.address) {
              if (data.address.city || data.address.town || data.address.state_district) {
                setCity(data.address.city || data.address.town || data.address.state_district || '');
              }
              if (data.address.suburb || data.address.neighbourhood) {
                setArea(data.address.suburb || data.address.neighbourhood || '');
              }
              if (data.address.postcode) setPincode(data.address.postcode);
              setApproxAddress(data.display_name.split(',').slice(0, 3).join(','));
              setExactAddress(data.display_name);
            }
          } catch (e) {
            console.error('Reverse geocode error', e);
          }
        },
        (err) => alert('Geolocation error: ' + err.message + '. Please ensure location permission is enabled.'),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
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
      }
    } catch (e) {
      console.error('Forward geocoding error', e);
    }
  };

  // Dimensions & Access
  const [maxLengthM, setMaxLengthM] = useState<number | undefined>(5.2);
  const [maxWidthM, setMaxWidthM] = useState<number | undefined>(2.4);
  const [maxHeightM, setMaxHeightM] = useState<number | undefined>(2.1);
  const [has247Access, setHas247Access] = useState(true);
  const [hasGatedAccess, setHasGatedAccess] = useState(false);
  const [hasSecurityGuard, setHasSecurityGuard] = useState(false);
  const [parkingRules, setParkingRules] = useState('Reverse entry preferred. No engine idling after 10 PM. Park strictly within marked bay.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (verificationStatus && !verificationStatus.can_submit_space) {
      setError('Host Identity Verification required before submitting a parking space. Please complete all 5 requirements.');
      setIsVerificationModalOpen(true);
      return;
    }

    if (!title || !city || !area || !approxAddress || !exactAddress) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    // 0. Physical Presence Proof (Prove You Are Physically There)
    if (!locationProof || !locationProof.is_location_verified) {
      setError("Physical presence proof required: Please complete the '📍 Verify Parking Location (Prove You Are Physically There)' step before submitting.");
      return;
    }

    // 1. Mandatory Photo Angle Validations (Anti-Fraud Real Camera Policy)
    if (!photos.ENTRANCE?.url) {
      setError("Mandatory live photo missing: Please capture 'Entrance from road' using your live device camera.");
      return;
    }
    if (!photos.PARKING_SLOT?.url) {
      setError("Mandatory live photo missing: Please capture 'Actual parking slot' using your live device camera.");
      return;
    }
    if (!photos.SURROUNDINGS?.url) {
      setError("Mandatory live photo missing: Please capture 'Wider view showing surroundings/access' using your live device camera.");
      return;
    }

    const isCoveredSpace = isCovered || isIndoor || parkingType === 'COVERED_PARKING' || parkingType === 'GARAGE';
    if (isCoveredSpace && !photos.ROOF_CLEARANCE?.url) {
      setError("For covered/indoor/garage parking, a live photo of the 'Roof / height-clearance' is mandatory.");
      return;
    }

    if (hasGatedAccess && !photos.GATE_ENTRY?.url) {
      setError("For gated access parking, a live photo of the 'Gate / entry area' is mandatory.");
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
        exact_address: exactAddress,
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center space-x-2">
          <Plus className="w-7 h-7 text-emerald-700" />
          <span>List a Parking Space</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">Provide space details, exact GPS pin, clearance dimensions, and pricing rules to start earning</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm font-semibold border border-red-200">
          {error}
        </div>
      )}

      {/* Host Identity Verification Status Banner */}
      {checkingVerification ? (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 text-xs text-gray-500 animate-pulse">
          Checking host compliance & verification status...
        </div>
      ) : verificationStatus && !verificationStatus.can_submit_space ? (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-amber-700">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-amber-950">Host Identity Verification Required</h2>
                <p className="text-xs text-amber-800 mt-0.5">
                  Before allowing a host to submit a space, safety regulations require full verification of legal name, mobile OTP, email OTP, profile photo, and Government ID (Aadhaar / Driving Licence / Passport).
                </p>
              </div>
            </div>
            <Link
              to="/verification"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow flex-shrink-0 self-start sm:self-auto"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Identity Now</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-2 text-xs">
            <div className={`p-2.5 rounded-xl border flex items-center space-x-2 font-medium ${verificationStatus.has_legal_name ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-amber-200 text-gray-600'}`}>
              <span className={verificationStatus.has_legal_name ? 'text-emerald-600 font-bold' : 'text-gray-400'}>{verificationStatus.has_legal_name ? '✓' : '○'}</span>
              <span>Legal Name</span>
            </div>
            <div className={`p-2.5 rounded-xl border flex items-center space-x-2 font-medium ${verificationStatus.phone_verified ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-amber-200 text-gray-600'}`}>
              <span className={verificationStatus.phone_verified ? 'text-emerald-600 font-bold' : 'text-gray-400'}>{verificationStatus.phone_verified ? '✓' : '○'}</span>
              <span>Mobile OTP</span>
            </div>
            <div className={`p-2.5 rounded-xl border flex items-center space-x-2 font-medium ${verificationStatus.email_verified ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-amber-200 text-gray-600'}`}>
              <span className={verificationStatus.email_verified ? 'text-emerald-600 font-bold' : 'text-gray-400'}>{verificationStatus.email_verified ? '✓' : '○'}</span>
              <span>Email Verified</span>
            </div>
            <div className={`p-2.5 rounded-xl border flex items-center space-x-2 font-medium ${verificationStatus.has_profile_photo ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-amber-200 text-gray-600'}`}>
              <span className={verificationStatus.has_profile_photo ? 'text-emerald-600 font-bold' : 'text-gray-400'}>{verificationStatus.has_profile_photo ? '✓' : '○'}</span>
              <span>Profile Photo</span>
            </div>
            <div className={`p-2.5 rounded-xl border flex items-center space-x-2 font-medium ${verificationStatus.has_gov_id ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-amber-200 text-gray-600'}`}>
              <span className={verificationStatus.has_gov_id ? 'text-emerald-600 font-bold' : 'text-gray-400'}>{verificationStatus.has_gov_id ? '✓' : '○'}</span>
              <span>Gov ID (Aadhaar/DL)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-950">
          <div className="flex items-center space-x-2 font-semibold">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>
              Verified Space Host: <strong>{verificationStatus?.legal_name || 'Verified'}</strong> • Government ID Verified ({verificationStatus?.gov_id_type || 'Aadhaar e-KYC'})
            </span>
          </div>
          <span className="bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full text-[11px] border border-emerald-300">
            Space Submission Unlocked
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-6">
        {/* Basic Details */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">1. Host Type & Location Space</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
            <button
              type="button"
              onClick={() => setHostType('INDIVIDUAL')}
              className={`p-3 rounded-2xl border text-left transition ${
                hostType === 'INDIVIDUAL'
                  ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-emerald-300'
              }`}
            >
              <span className="text-xs font-extrabold block">🏡 Individual Homeowner</span>
              <span className="text-[11px] text-gray-500 font-normal">1-2 private driveway or garage spaces</span>
            </button>

            <button
              type="button"
              onClick={() => setHostType('BUSINESS')}
              className={`p-3 rounded-2xl border text-left transition ${
                hostType === 'BUSINESS'
                  ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-emerald-300'
              }`}
            >
              <span className="text-xs font-extrabold block">🏢 Business / Commercial Operator</span>
              <span className="text-[11px] text-gray-500 font-normal">10-100+ spaces under one location</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Listing / Location Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. MG Road Shopping Complex Parking"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Parking Type *</label>
              <select
                value={parkingType}
                onChange={(e) => setParkingType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="DRIVEWAY">Private Driveway</option>
                <option value="GARAGE">Covered Garage</option>
                <option value="APARTMENT_PARKING">Apartment Parking Slot</option>
                <option value="OPEN_LOT">Open Gated Lot</option>
                <option value="COMMERCIAL_PARKING">Shop / Commercial Bay</option>
                <option value="PRIVATE_PARKING">Private Dedicated Bay</option>
                <option value="OTHER">Other Space</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location & GPS */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">2. GPS & Address Details</h2>
            <button
              type="button"
              onClick={detectLocation}
              className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition flex items-center space-x-1"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Use Device GPS</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">City *</label>
              <input
                type="text"
                required
                placeholder="Bengaluru"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Area / Suburb *</label>
              <input
                type="text"
                required
                placeholder="Indiranagar 100ft Road"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Pincode</label>
              <input
                type="text"
                placeholder="560038"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-12">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Public Display Address (Masked for privacy) *</label>
              <input
                type="text"
                required
                placeholder="Near 100ft Road, Indiranagar, Bengaluru"
                value={approxAddress}
                onChange={(e) => setApproxAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-12 space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-gray-700 uppercase">Exact Address (Revealed ONLY after confirmed payment) *</label>
                <button
                  type="button"
                  onClick={() => geocodeTypedAddress()}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                >
                  Sync GPS Pin from Address
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="House #42, 4th Cross, 100ft Road, Indiranagar, Bengaluru"
                value={exactAddress}
                onChange={(e) => setExactAddress(e.target.value)}
                onBlur={() => geocodeTypedAddress()}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[11px] text-gray-500 block font-mono">
                Current GPS Map Pin: <strong className="text-emerald-800">{lat.toFixed(6)}, {lng.toFixed(6)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Space Dimensions & Clearance */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">3. Vehicle Fit & Clearance Limits</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Max Length (Meters)</label>
              <input
                type="number"
                step="0.1"
                placeholder="5.2"
                value={maxLengthM || ''}
                onChange={(e) => setMaxLengthM(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Max Width (Meters)</label>
              <input
                type="number"
                step="0.1"
                placeholder="2.4"
                value={maxWidthM || ''}
                onChange={(e) => setMaxWidthM(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Height Clearance (Meters)</label>
              <input
                type="number"
                step="0.1"
                placeholder="2.1"
                value={maxHeightM || ''}
                onChange={(e) => setMaxHeightM(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Amenities */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">4. Pricing & Amenities</h2>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Hourly Price (₹) *</label>
              <input
                type="number"
                required
                value={hourlyPrice}
                onChange={(e) => setHourlyPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Daily Price (₹) *</label>
              <input
                type="number"
                required
                value={dailyPrice}
                onChange={(e) => setDailyPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Vehicle Slot Capacity *</label>
              <input
                type="number"
                required
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-gray-700">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={has247Access}
                onChange={(e) => setHas247Access(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>24/7 Access</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasGatedAccess}
                onChange={(e) => setHasGatedAccess(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Gated Access</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSecurityGuard}
                onChange={(e) => setHasSecurityGuard(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Security Guard</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCovered}
                onChange={(e) => setIsCovered(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Covered Roof</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasCctv}
                onChange={(e) => setHasCctv(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>24/7 CCTV</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasEv}
                onChange={(e) => setHasEv(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>EV Charger Available</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Host Parking Rules & House Guidelines</label>
            <textarea
              rows={3}
              placeholder="e.g. Reverse entry preferred. No loud idling after 10 PM. Park strictly within marked lines."
              value={parkingRules}
              onChange={(e) => setParkingRules(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Section: Physical Location Proof (Prove You Are Physically There) */}
          <div className="pt-6 border-t border-gray-200">
            <PhysicalLocationProofStep
              declaredLat={lat}
              declaredLng={lng}
              declaredAddress={exactAddress || approxAddress}
              verificationData={locationProof}
              onVerificationChange={setLocationProof}
            />
          </div>

          {/* Section: Live Camera Photos of Parking Space (Mandatory Anti-Fraud Policy) */}
          <div className="pt-6 border-t border-gray-200">
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

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center space-x-1.5">
              <span>🔒 Admin Review & Approval Required</span>
            </div>
            <p>
              To maintain marketplace safety and trust, your parking space will be submitted with status <strong>PENDING_APPROVAL</strong>.
              It will become searchable on the Customer App immediately after an Admin approves your listing.
            </p>
          </div>
        </div>

        {verificationStatus && !verificationStatus.can_submit_space ? (
          <Link
            to="/verification"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition text-sm flex items-center justify-center space-x-2"
          >
            <Lock className="w-4 h-4" />
            <span>Complete Identity Verification to Submit Space</span>
          </Link>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition text-sm disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Submitting Space for Review...' : 'Submit Space for Admin Review'}</span>
          </button>
        )}
      </form>

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
