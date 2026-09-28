import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, Filter, LayoutGrid, Map, Loader2, Navigation, Compass } from 'lucide-react';
import { ParkingListing } from '../types';
import { api } from '../services/api';
import { ListingCard } from '../components/ListingCard';
import { MapView } from '../components/MapView';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [area, setArea] = useState(searchParams.get('area') || '');
  const [vehicleType, setVehicleType] = useState(searchParams.get('vehicle_type') || '');
  const [radiusKm, setRadiusKm] = useState<number>(
    searchParams.get('radius_km') ? parseFloat(searchParams.get('radius_km')!) : 10
  );
  
  // Live Geolocation State
  const [userLat, setUserLat] = useState<number | undefined>(
    searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined
  );
  const [userLng, setUserLng] = useState<number | undefined>(
    searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined
  );
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsActive, setGpsActive] = useState(!!searchParams.get('lat'));

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const data = await api.searchListings({
        city: city || undefined,
        area: area || undefined,
        vehicle_type: vehicleType || undefined,
        lat: userLat,
        lng: userLng,
        radius_km: radiusKm,
      });
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [searchParams, userLat, userLng, radiusKm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p: Record<string, string> = {};
    if (city) p.city = city;
    if (area) p.area = area;
    if (vehicleType) p.vehicle_type = vehicleType;
    if (userLat !== undefined && userLng !== undefined) {
      p.lat = userLat.toString();
      p.lng = userLng.toString();
      p.radius_km = radiusKm.toString();
    }
    setSearchParams(p);
  };

  // Dedicated "Nearby Me" GPS Button
  const handleNearbyMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        setGpsActive(true);
        setDetectingGps(false);

        // Clear city/area text search when using "Nearby Me" GPS mode
        setCity('');
        setArea('');

        setSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
          radius_km: radiusKm.toString(),
        });
      },
      (err) => {
        setDetectingGps(false);
        alert('Location access denied or unavailable. Please enable browser location permissions.');
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Search & "Nearby Me" Control Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        
        {/* Prominent "Nearby Me" Banner Quick Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 rounded-2xl border border-emerald-200">
          <div className="flex items-center space-x-3 text-emerald-950">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Need a space right now?</h3>
              <p className="text-xs text-emerald-800">Use your device's live location to find nearest available parking spaces.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNearbyMe}
            disabled={detectingGps}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
          >
            {detectingGps ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Navigation className="w-4 h-4 fill-white text-white" />
            )}
            <span>{detectingGps ? 'Locating You...' : '📍 Nearby Me (Use Live GPS)'}</span>
          </button>
        </div>

        {/* Filter Inputs Form */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200">
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <input
              type="text"
              placeholder="City (e.g. Bengaluru)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-transparent text-sm w-full outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Area / Landmark (e.g. Koramangala)"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="bg-transparent text-sm w-full outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="bg-transparent text-sm w-full outline-none text-slate-700"
            >
              <option value="">All Vehicle Types</option>
              <option value="CAR">Car</option>
              <option value="SUV">SUV</option>
              <option value="BIKE">Bike</option>
              <option value="SCOOTER">Scooter</option>
            </select>
          </div>

          {gpsActive ? (
            <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-2.5 rounded-xl border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-800 flex-shrink-0">Distance:</span>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                className="bg-transparent text-sm w-full outline-none text-emerald-900 font-bold"
              >
                <option value={2}>Within 2 km</option>
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={25}>Within 25 km</option>
              </select>
            </div>
          ) : (
            <button
              type="submit"
              className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
            >
              Apply Filters
            </button>
          )}

        </form>

        {/* View Switcher & GPS Indicator */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <p className="text-slate-500 font-medium">
              Found <span className="font-bold text-slate-900">{listings.length}</span> parking spaces
            </p>
            {gpsActive && (
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center space-x-1">
                <Navigation className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                <span>Active: Nearby Me ({radiusKm} km radius)</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1 ${
                viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>

            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1 ${
                viewMode === 'map' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Results View */}
      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : viewMode === 'map' ? (
        <MapView listings={listings} />
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto my-12">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No Parking Spaces Found Nearby</h3>
          <p className="text-xs text-slate-500 mt-1">Try expanding the distance radius or searching by city name.</p>
        </div>
      )}

    </div>
  );
};
