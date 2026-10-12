import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, MapPin, Filter, Car, Zap, Shield, Star, DollarSign, Navigation, Info, Lock } from 'lucide-react';
import { api } from '../services/api';
import { ParkingListing } from '../types';

export const CustomerSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [area, setArea] = useState(searchParams.get('area') || '');
  const [vehicleType, setVehicleType] = useState(searchParams.get('vehicle_type') || '');
  const [evOnly, setEvOnly] = useState(false);
  const [coveredOnly, setCoveredOnly] = useState(false);

  const [liveLocationName, setLiveLocationName] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
      const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;

      const data = await api.searchListings({
        city: city || undefined,
        area: area || undefined,
        vehicle_type: vehicleType || undefined,
        lat,
        lng,
      });
      setListings(data);
    } catch (err) {
      console.error('Failed to search listings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: any = {};
    if (city) params.city = city;
    if (area) params.area = area;
    if (vehicleType) params.vehicle_type = vehicleType;
    setSearchParams(params);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setGpsCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          if (data && data.address) {
            const locName = [
              data.address.suburb || data.address.neighbourhood || data.address.residential,
              data.address.city || data.address.town || data.address.county
            ].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 3).join(',');
            
            setLiveLocationName(locName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            if (data.address.city || data.address.town) {
              setCity(data.address.city || data.address.town);
            }
            if (data.address.suburb || data.address.neighbourhood) {
              setArea(data.address.suburb || data.address.neighbourhood);
            }
          } else {
            setLiveLocationName(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
          }
        } catch (e) {
          console.error('Reverse geocode error', e);
          setLiveLocationName(`Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setIsLocating(false);
        }

        setSearchParams({
          lat: latitude.toString(),
          lng: longitude.toString(),
        });
      },
      (err) => {
        setIsLocating(false);
        alert('GPS Error: ' + err.message + '. Please check GPS permissions.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const filteredListings = listings.filter((item) => {
    if (evOnly && !item.has_ev_charging) return false;
    if (coveredOnly && !item.is_covered) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      {/* Header & Filter Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center space-x-2">
              <Search className="w-5 h-5 text-blue-600" />
              <span>Search Parking Spots</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Find available private bays, garages & driveways</p>
          </div>

          <button
            onClick={useCurrentLocation}
            disabled={isLocating}
            className="inline-flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3.5 py-2 rounded-xl text-xs transition border border-blue-200 disabled:opacity-50 self-start sm:self-auto"
          >
            <Navigation className={`w-3.5 h-3.5 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Near My GPS'}</span>
          </button>
        </div>

        {liveLocationName && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-blue-950 text-xs shadow-xs font-semibold">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping flex-shrink-0" />
              <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Detected GPS Location</span>
                <span className="font-extrabold text-blue-900 text-xs sm:text-sm">{liveLocationName}</span>
                {gpsCoords && <span className="text-[11px] text-blue-600 ml-2 font-mono">({gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)})</span>}
              </div>
            </div>
            <span className="bg-blue-600 text-white font-extrabold px-2.5 py-1 rounded-lg text-[10px] shadow-xs self-end sm:self-auto">
              📍 GPS Active
            </span>
          </div>
        )}

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="City (e.g. Bengaluru)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="Area / Neighborhood"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Vehicles</option>
              <option value="CAR">Car / Hatchback</option>
              <option value="SUV">SUV / Sedan</option>
              <option value="BIKE">Two-Wheeler / Bike</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md shadow-blue-500/25 transition"
            >
              Apply Filter
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={evOnly}
              onChange={(e) => setEvOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>EV Charging Only</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={coveredOnly}
              onChange={(e) => setCoveredOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>Covered Roof Only</span>
          </label>
        </div>
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs font-bold">Scanning for available parking spaces...</div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-3">
          <Info className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-900">No Parking Spaces Found</h3>
          <p className="text-xs text-slate-500">Try adjusting your location search or filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 bg-slate-100">
                  <img
                    src={listing.images[0]?.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80'}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-slate-900/80 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded-full backdrop-blur-xs">
                    {listing.parking_type}
                  </div>
                  <div className="absolute top-2.5 right-2.5 bg-white/95 text-slate-900 font-bold text-xs px-2 py-0.5 rounded-full shadow-xs flex items-center space-x-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>{listing.average_rating || '4.8'}</span>
                  </div>
                </div>

                <div className="p-4 space-y-2.5">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 line-clamp-1">{listing.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span className="line-clamp-1">{listing.approximate_address}</span>
                    </p>
                    <div className="mt-1.5 flex items-center space-x-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg w-fit">
                      <Lock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                      <span>Exact location & host phone unlock after booking</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                    {listing.is_covered && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Covered</span>
                    )}
                    {listing.has_ev_charging && (
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">EV Charger</span>
                    )}
                    {listing.has_cctv && (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">CCTV</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Hourly Rate</span>
                  <div className="text-lg font-black text-blue-700">
                    ₹{listing.pricing_rule?.hourly_price || 40} <span className="text-xs font-normal text-slate-500">/ hr</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    to={`/listing/${listing.id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-sm shadow-blue-500/20 flex items-center space-x-1"
                  >
                    <span>View Spot & Reserve</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
