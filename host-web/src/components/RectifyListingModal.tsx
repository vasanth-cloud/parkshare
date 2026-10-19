import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ParkingListing } from '../types';
import { 
  LiveSpaceCameraCapture, 
  CapturedPhoto, 
  PhotoAngleKey 
} from './LiveSpaceCameraCapture';
import { PhysicalLocationProofStep, LocationProof } from './PhysicalLocationProofStep';
import { 
  X, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  Camera, 
  ShieldAlert, 
  DollarSign, 
  Car, 
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  Edit3,
  MapPin,
  Sparkles
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  listing: ParkingListing | null;
  onSuccess: () => void;
}

export const RectifyListingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  listing,
  onSuccess,
}) => {
  if (!isOpen || !listing) return null;

  // Step Wizard State (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description || '');
  const [parkingType, setParkingType] = useState(listing.parking_type || 'DRIVEWAY');
  const [capacity, setCapacity] = useState<number>(listing.capacity || 1);
  const [hourlyPrice, setHourlyPrice] = useState<number>(listing.pricing_rule?.hourly_price || 40);
  const [dailyPrice, setDailyPrice] = useState<number>(listing.pricing_rule?.daily_price || 250);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(listing.pricing_rule?.monthly_price || 3500);
  
  // Features
  const [isCovered, setIsCovered] = useState(listing.is_covered || false);
  const [isIndoor, setIsIndoor] = useState(listing.is_indoor || false);
  const [hasGatedAccess, setHasGatedAccess] = useState(false);
  const [hasCctv, setHasCctv] = useState(listing.has_cctv || false);
  const [hasEv, setHasEv] = useState(listing.has_ev_charging || false);
  const [parkingRules, setParkingRules] = useState('');

  // Photos & Location Proof
  const [photos, setPhotos] = useState<Partial<Record<PhotoAngleKey, CapturedPhoto>>>({});
  const [locationProof, setLocationProof] = useState<LocationProof | null>(
    listing.is_location_verified && listing.verified_latitude && listing.verified_longitude && listing.verification_photo_url
      ? {
          is_location_verified: listing.is_location_verified,
          verified_latitude: listing.verified_latitude,
          verified_longitude: listing.verified_longitude,
          verified_at: listing.verified_at || new Date().toISOString(),
          verification_photo_url: listing.verification_photo_url,
          gps_accuracy_m: listing.location_verification_metadata?.gps_accuracy_m ?? 10,
          distance_to_declared_m: listing.location_verification_metadata?.distance_to_declared_m ?? 0,
          is_address_match: listing.location_verification_metadata?.is_address_match ?? true,
        }
      : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (listing) {
      setCurrentStep(1);
      if (listing.is_location_verified && listing.verified_latitude && listing.verified_longitude && listing.verification_photo_url) {
        setLocationProof({
          is_location_verified: listing.is_location_verified,
          verified_latitude: listing.verified_latitude,
          verified_longitude: listing.verified_longitude,
          verified_at: listing.verified_at || new Date().toISOString(),
          verification_photo_url: listing.verification_photo_url,
          gps_accuracy_m: listing.location_verification_metadata?.gps_accuracy_m ?? 10,
          distance_to_declared_m: listing.location_verification_metadata?.distance_to_declared_m ?? 0,
          is_address_match: listing.location_verification_metadata?.is_address_match ?? true,
        });
      } else {
        setLocationProof(null);
      }
      setTitle(listing.title);
      setDescription(listing.description || '');
      setParkingType(listing.parking_type || 'DRIVEWAY');
      setCapacity(listing.capacity || 1);
      setHourlyPrice(listing.pricing_rule?.hourly_price || 40);
      setDailyPrice(listing.pricing_rule?.daily_price || 250);
      setMonthlyPrice(listing.pricing_rule?.monthly_price || 3500);
      setIsCovered(listing.is_covered || false);
      setIsIndoor(listing.is_indoor || false);
      setHasCctv(listing.has_cctv || false);
      setHasEv(listing.has_ev_charging || false);

      // Pre-fill existing photos mapped to slot keys
      const initialPhotos: Partial<Record<PhotoAngleKey, CapturedPhoto>> = {};
      if (listing.images && listing.images.length > 0) {
        listing.images.forEach((img) => {
          const c = (img.caption || '').toUpperCase();
          let key: PhotoAngleKey | null = null;
          if (c.includes('ENTRANCE') || c.includes('ROAD')) key = 'ENTRANCE';
          else if (c.includes('SLOT') || c.includes('PARKING')) key = 'PARKING_SLOT';
          else if (c.includes('SURROUNDING') || c.includes('WIDE') || c.includes('ACCESS')) key = 'SURROUNDINGS';
          else if (c.includes('ROOF') || c.includes('CLEARANCE') || c.includes('HEIGHT')) key = 'ROOF_CLEARANCE';
          else if (c.includes('GATE') || c.includes('BARRIER')) key = 'GATE_ENTRY';

          if (key && !initialPhotos[key]) {
            initialPhotos[key] = {
              url: img.image_url,
              capturedAt: 'Previously Submitted',
              angleLabel: img.caption || key,
            };
          }
        });
      }
      setPhotos(initialPhotos);
      setError('');
      setSuccessMsg('');
    }
  }, [listing]);

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return 'Space Basics';
      case 2:
        return 'Location Proof';
      case 3:
        return 'Features & Rules';
      case 4:
        return 'Pricing';
      case 5:
        return 'Space Photos';
      default:
        return '';
    }
  };

  const handleNextStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!title.trim()) {
        setError('Please enter a space title');
        return;
      }
    }
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSubmitRectification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check physical location verification
    if (!locationProof || !locationProof.is_location_verified) {
      setCurrentStep(2);
      setError("Physical presence proof required: Please complete the'Verify Parking Location'step.");
      return;
    }

    // Check mandatory photos
    if (!photos.ENTRANCE?.url || !photos.PARKING_SLOT?.url || !photos.SURROUNDINGS?.url) {
      setCurrentStep(5);
      setError("Mandatory live photos missing: Entrance, Parking Slot, and Surroundings are required.");
      return;
    }

    const isCoveredSpace = isCovered || isIndoor || parkingType === 'COVERED_PARKING' || parkingType === 'GARAGE';
    if (isCoveredSpace && !photos.ROOF_CLEARANCE?.url) {
      setCurrentStep(5);
      setError("For covered/indoor/garage parking, a live photo of the 'Roof / height-clearance' is mandatory.");
      return;
    }

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

    try {
      await api.updateListing(listing.id, {
        title,
        description,
        parking_type: parkingType,
        capacity,
        total_spaces: capacity,
        is_covered: isCovered,
        is_indoor: isIndoor,
        has_cctv: hasCctv,
        has_ev_charging: hasEv,
        has_gated_access: hasGatedAccess,
        parking_rules: parkingRules || undefined,
        pricing_rule: {
          hourly_price: hourlyPrice,
          daily_price: dailyPrice,
          monthly_price: monthlyPrice,
          multi_day_discount_percent: 0,
        },
        images: imagesPayload,
        location_verification: locationProof,
        resubmit_for_approval: listing.status === 'REJECTED',
      });

      setSuccessMsg('✓ Space listing updated successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to update space listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {listing.status === 'REJECTED' ? 'Fix Space & Resubmit' : 'Edit Parking Space'}
              </h3>
              <p className="text-[11px] text-slate-300">
                Step {currentStep} of 5 • {getStepTitle(currentStep)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Numbered Pills (1, 2, 3, 4, 5) */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCurrentStep(s)}
                className={`w-7 h-7 rounded-full text-xs font-black transition flex items-center justify-center cursor-pointer ${
                  currentStep === s
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30'
                    : currentStep > s
                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                }`}
              >
                {currentStep > s ? '✓' : s}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-bold text-gray-600">
            {getStepTitle(currentStep)}
          </span>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmitRectification} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Rejection Alert if applicable */}
          {listing.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 space-y-1.5 text-red-950 shadow-2xs">
              <div className="flex items-center space-x-1.5 font-bold text-red-800 text-xs">
                <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>Admin Rejection Reason:</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-red-200 text-red-900 font-medium text-xs leading-relaxed">
                "{listing.rejection_reason || 'Please retake clear real photos on-site and verify space details.'}"
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ===================== STEP 1: BASICS ===================== */}
          {currentStep === 1 && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Space Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Safe Gated Driveway near Metro"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Parking Type *</label>
                  <select
                    value={parkingType}
                    onChange={(e) => setParkingType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="DRIVEWAY">Driveway</option>
                    <option value="PRIVATE_PARKING">Private Parking</option>
                    <option value="APARTMENT_PARKING">Apartment Parking</option>
                    <option value="COMMERCIAL_PARKING">Commercial Parking</option>
                    <option value="COVERED_PARKING">Covered Parking</option>
                    <option value="GARAGE">Garage</option>
                    <option value="OPEN_LOT">Open Lot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Spot Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description / Access Notes</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Helpful access directions, landmarks, or special instructions for drivers..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ===================== STEP 2: LOCATION VERIFICATION ===================== */}
          {currentStep === 2 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-gray-900 block">Registered Address</span>
                  <span className="text-gray-600 block mt-0.5">
                    {listing.exact_address || listing.approximate_address || `${listing.area}, ${listing.city}`}
                  </span>
                </div>
              </div>

              <PhysicalLocationProofStep
                declaredLat={listing.latitude}
                declaredLng={listing.longitude}
                declaredAddress={listing.exact_address || listing.approximate_address}
                verificationData={locationProof}
                onVerificationChange={setLocationProof}
              />
            </div>
          )}

          {/* ===================== STEP 3: FEATURES & RULES ===================== */}
          {currentStep === 3 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Amenities & Features</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-700">
                  <label className={`p-2.5 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${isCovered ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-gray-50 border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={isCovered}
                      onChange={(e) => setIsCovered(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Covered Roof</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${hasGatedAccess ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-gray-50 border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={hasGatedAccess}
                      onChange={(e) => setHasGatedAccess(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Gated Access</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${hasCctv ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-gray-50 border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={hasCctv}
                      onChange={(e) => setHasCctv(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>24/7 CCTV</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${hasEv ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-gray-50 border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={hasEv}
                      onChange={(e) => setHasEv(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>EV Charger</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">House Rules (Optional)</label>
                <textarea
                  rows={2}
                  value={parkingRules}
                  onChange={(e) => setParkingRules(e.target.value)}
                  placeholder="e.g. Reverse parking preferred. Please avoid loud horn."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ===================== STEP 4: PRICING ===================== */}
          {currentStep === 4 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Hourly & Daily Rates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <label className="block text-xs font-bold text-emerald-950 uppercase mb-1">Hourly Rate (₹) *</label>
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
                  <label className="block text-xs font-bold text-emerald-950 uppercase mb-1">Daily Pass (₹) *</label>
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

              {/* Monthly Subscription */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Monthly Pass (₹)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    min={100}
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                    placeholder="3500"
                    className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 flex items-center justify-between">
                <span>Monthly passes attract verified long-term corporate commuters.</span>
                <span className="font-bold text-emerald-700">Guaranteed Recurring Income</span>
              </div>
            </div>
          )}

          {/* ===================== STEP 5: PHOTOS ===================== */}
          {currentStep === 5 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Live Camera Photos</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Retake any rejected or blurry photo with live camera
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
                currentLat={listing.latitude}
                currentLng={listing.longitude}
              />
            </div>
          )}

          {/* Bottom Step Navigation Bar */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-gray-500 hover:text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer ml-auto"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black transition shadow-md flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer ml-auto"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? 'Saving...'
                    : listing.status === 'REJECTED'
                    ? 'Resubmit Space'
                    : 'Save Changes'}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RectifyListingModal;
