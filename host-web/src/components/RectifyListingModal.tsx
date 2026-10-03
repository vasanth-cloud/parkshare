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
  Send
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

  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description || '');
  const [parkingType, setParkingType] = useState(listing.parking_type || 'DRIVEWAY');
  const [capacity, setCapacity] = useState<number>(listing.capacity || 1);
  const [hourlyPrice, setHourlyPrice] = useState<number>(listing.pricing_rule?.hourly_price || 40);
  const [dailyPrice, setDailyPrice] = useState<number>(listing.pricing_rule?.daily_price || 250);
  
  // Features
  const [isCovered, setIsCovered] = useState(listing.is_covered || false);
  const [isIndoor, setIsIndoor] = useState(listing.is_indoor || false);
  const [hasGatedAccess, setHasGatedAccess] = useState(false);
  const [hasCctv, setHasCctv] = useState(listing.has_cctv || false);
  const [hasEv, setHasEv] = useState(listing.has_ev_charging || false);
  const [parkingRules, setParkingRules] = useState('');

  // Photos
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

  const handleSubmitRectification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 0. Physical Location Verification
    if (!locationProof || !locationProof.is_location_verified) {
      setError("Physical presence proof required: Please complete the '📍 Verify Parking Location' step.");
      return;
    }

    // Check mandatory photos
    if (!photos.ENTRANCE?.url) {
      setError("Mandatory real photo missing: Please capture 'Entrance from road' using your live device camera.");
      return;
    }
    if (!photos.PARKING_SLOT?.url) {
      setError("Mandatory real photo missing: Please capture 'Actual parking slot' using your live device camera.");
      return;
    }
    if (!photos.SURROUNDINGS?.url) {
      setError("Mandatory real photo missing: Please capture 'Wider view showing surroundings/access' using your live device camera.");
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
        },
        images: imagesPayload,
        location_verification: locationProof,
        resubmit_for_approval: true,
      });

      setSuccessMsg('✓ Space listing updated and resubmitted for admin review!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update and resubmit listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <span>Rectify Space Listing & Resubmit</span>
              </h3>
              <p className="text-xs text-slate-300">
                Fix the issues highlighted by admin moderation and resubmit for approval
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmitRectification} className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Prominent Admin Rejection Reason Alert */}
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 space-y-2 text-red-950 shadow-sm">
            <div className="flex items-center space-x-2 font-bold text-red-800 text-sm">
              <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>Admin Rejection Reason:</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-red-200 text-red-900 font-semibold text-xs leading-relaxed">
              "{listing.rejection_reason || 'Photos or space details do not meet safety requirements. Please retake clear real photos on-site and resubmit.'}"
            </div>
            <p className="text-[11px] text-red-700">
              Please rectify the points mentioned above. Retake any rejected photos using your live device camera below.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Basic Details */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">1. Space Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Space Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Parking Type *</label>
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

              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Description / Access Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide any updated directions or clarifications for drivers..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Hourly Price (₹) *</label>
                <input
                  type="number"
                  min={10}
                  value={hourlyPrice}
                  onChange={(e) => setHourlyPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Daily Price (₹)</label>
                <input
                  type="number"
                  min={50}
                  value={dailyPrice}
                  onChange={(e) => setDailyPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Checkbox Features */}
            <div className="flex flex-wrap gap-4 pt-2 font-semibold text-gray-700">
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
                  checked={hasGatedAccess}
                  onChange={(e) => setHasGatedAccess(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Gated Access</span>
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
                <span>EV Charging</span>
              </label>
            </div>
          </div>

          {/* Section: Physical Location Proof */}
          <div className="space-y-3">
            <PhysicalLocationProofStep
              declaredLat={listing.latitude}
              declaredLng={listing.longitude}
              declaredAddress={listing.exact_address || listing.approximate_address}
              verificationData={locationProof}
              onVerificationChange={setLocationProof}
            />
          </div>

          {/* Section: Live Camera Photos Rectification */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>2. Live Camera Photos (Retake Any Rejected Photo)</span>
              </h4>
              <span className="text-[10px] text-gray-500">Live Device Camera Required</span>
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

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Resubmitting Space...' : 'Update & Resubmit for Admin Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
