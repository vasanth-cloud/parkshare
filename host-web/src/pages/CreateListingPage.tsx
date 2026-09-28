import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { MapPin, Plus, Navigation } from 'lucide-react';

export const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();

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
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80');

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
    if (!title || !city || !area || !approxAddress || !exactAddress) {
      setError('Please fill in all mandatory fields.');
      return;
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
        images: [{ image_url: imageUrl, caption: 'Cover view', is_cover: true }],
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition text-sm disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <span>{loading ? 'Submitting Space for Review...' : 'Submit Space for Admin Review'}</span>
        </button>
      </form>
    </div>
  );
};
