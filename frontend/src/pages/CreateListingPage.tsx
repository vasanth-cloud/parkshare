import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, MapPin, DollarSign, Shield, Check, Navigation, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export const CreateListingPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parkingType, setParkingType] = useState('DRIVEWAY');
  const [exactAddress, setExactAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('560034');
  const [lat, setLat] = useState(12.9345);
  const [lng, setLng] = useState(77.6101);

  const [hourlyPrice, setHourlyPrice] = useState(35);
  const [isCovered, setIsCovered] = useState(true);
  const [hasEvCharging, setHasEvCharging] = useState(false);
  const [accessInstructions, setAccessInstructions] = useState('');

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // Browser Live Geolocation API & Reverse Geocoding
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setLat(userLat);
        setLng(userLng);

        try {
          // Reverse geocode via OpenStreetMap Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            setExactAddress(data.display_name || '');
            setArea(addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || 'Local Area');
            if (addr.city || addr.town || addr.village) setCity(addr.city || addr.town || addr.village);
            if (addr.state) setState(addr.state);
            if (addr.postcode) setPincode(addr.postcode);
          }
        } catch (err) {
          console.error('Reverse geocode error:', err);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        setError('Location permission denied or unavailable. Please enter coordinates or address manually.');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.createListing({
        title,
        description,
        parking_type: parkingType,
        exact_address: exactAddress,
        area,
        city,
        state,
        pincode,
        latitude: lat,
        longitude: lng,
        access_instructions: accessInstructions,
        capacity: 1,
        is_covered: isCovered,
        has_ev_charging: hasEvCharging,
        allowed_vehicle_types: ['CAR', 'SUV', 'BIKE'],
        booking_mode: 'INSTANT',
        pricing_rule: {
          hourly_price: hourlyPrice,
          minimum_duration_hours: 1,
          maximum_duration_hours: 168,
        },
        availabilities: [
          { day_of_week: -1, start_time: '00:00', end_time: '23:59', is_available: true },
        ],
      });

      navigate('/host/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">List Your Parking Space</h1>
            <p className="text-xs text-slate-500 mt-1">Provide your space location, pricing, and operating rules.</p>
          </div>

          {/* Detect Live GPS Location Button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detectingLocation}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 border border-emerald-200 shadow-sm transition-all"
          >
            {detectingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <Navigation className="w-4 h-4 text-emerald-600" />
            )}
            <span>{detectingLocation ? 'Detecting Location...' : 'Use My Live GPS Location'}</span>
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Listing Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Covered Villa Driveway near Forum Mall"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Parking Type</label>
              <select
                value={parkingType}
                onChange={(e) => setParkingType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              >
                <option value="DRIVEWAY">Driveway</option>
                <option value="PRIVATE_PARKING">Private Parking</option>
                <option value="APARTMENT_PARKING">Apartment Parking</option>
                <option value="COMMERCIAL_PARKING">Commercial Lot</option>
                <option value="GARAGE">Garage</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hourly Rate (₹)</label>
              <input
                type="number"
                required
                min={10}
                value={hourlyPrice}
                onChange={(e) => setHourlyPrice(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Coordinates Preview Badge */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Latitude</span>
              <input
                type="number"
                step="any"
                required
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full font-mono font-bold bg-white px-2 py-1 rounded border border-slate-200"
              />
            </div>
            <div>
              <span className="text-slate-500 block">Longitude</span>
              <input
                type="number"
                step="any"
                required
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
                className="w-full font-mono font-bold bg-white px-2 py-1 rounded border border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Exact Address (Hidden until booking confirmed)</label>
            <input
              type="text"
              required
              value={exactAddress}
              onChange={(e) => setExactAddress(e.target.value)}
              placeholder="House #142, 5th Main Rd, Koramangala 4th Block"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Area / Neighborhood</label>
              <input
                type="text"
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Koramangala"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Access Instructions for Confirmed Driver</label>
            <textarea
              rows={2}
              value={accessInstructions}
              onChange={(e) => setAccessInstructions(e.target.value)}
              placeholder="e.g. Gate pillars are white. Park on the right side of the driveway."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="flex items-center space-x-6 pt-2">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isCovered}
                onChange={(e) => setIsCovered(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Covered Parking</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={hasEvCharging}
                onChange={(e) => setHasEvCharging(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>EV Charging Plug Available</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg transition-all text-sm disabled:opacity-50"
          >
            {submitting ? 'Submitting Listing...' : 'Submit Listing for Approval'}
          </button>

        </form>

      </div>
    </div>
  );
};
