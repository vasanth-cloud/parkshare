import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, MapPin, Filter, Car, Zap, Shield, Star, DollarSign, Navigation, Info } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header & Filter Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Search className="w-6 h-6 text-emerald-600" />
              <span>Find Parking Spaces</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">Discover available driveways, private bays & gated parking</p>
          </div>

          <button
            onClick={useCurrentLocation}
            disabled={isLocating}
            className="inline-flex items-center space-x-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50"
          >
            <Navigation className={`w-4 h-4 text-emerald-700 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Acquiring GPS Signal...' : 'Search Near My GPS'}</span>
          </button>
        </div>

        {liveLocationName && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 text-xs shadow-sm font-semibold">
            <div className="flex items-center space-x-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
              <MapPin className="w-4.5 h-4.5 text-emerald-700 flex-shrink-0" />
              <div>
                <span className="text-gray-500 font-bold uppercase tracking-wider block text-[10px]">Detected Live GPS Location</span>
                <span className="font-extrabold text-emerald-900 text-sm">{liveLocationName}</span>
                {gpsCoords && <span className="text-[11px] text-emerald-700 ml-2 font-mono">({gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)})</span>}
              </div>
            </div>
            <span className="bg-emerald-700 text-white font-extrabold px-3 py-1 rounded-xl text-[11px] shadow-xs self-end sm:self-auto">
              📍 Live GPS Filter Active
            </span>
          </div>
        )}

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="City (e.g. Bengaluru)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="Area / Neighborhood"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition"
            >
              Apply Filter
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600 pt-2 border-t border-gray-100">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={evOnly}
              onChange={(e) => setEvOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>EV Charging Only</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={coveredOnly}
              onChange={(e) => setCoveredOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>Covered Roof Only</span>
          </label>
        </div>
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="text-center py-16 text-gray-500 text-sm">Searching for available parking spaces...</div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 space-y-3">
          <Info className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900">No Parking Spaces Found</h3>
          <p className="text-sm text-gray-500">Try adjusting your location search or filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={listing.images[0]?.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80'}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-emerald-800/90 text-white font-bold text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                    {listing.parking_type}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/90 text-gray-900 font-bold text-xs px-2.5 py-1 rounded-full shadow flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{listing.average_rating || '4.8'}</span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{listing.title}</h3>
                    <p className="text-xs text-gray-500 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="line-clamp-1">{listing.approximate_address}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-xs font-medium">
                    {listing.is_covered && (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">Covered</span>
                    )}
                    {listing.has_ev_charging && (
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">EV Charger</span>
                    )}
                    {listing.has_cctv && (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">CCTV</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 font-medium">Hourly Rate</span>
                  <div className="text-lg font-extrabold text-emerald-800">
                    ₹{listing.pricing_rule?.hourly_price || 40} <span className="text-xs font-normal text-gray-600">/ hr</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const originLat = gpsCoords?.lat || (searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null);
                      const originLng = gpsCoords?.lng || (searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null);
                      const navUrl = originLat && originLng
                        ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${listing.latitude},${listing.longitude}`
                        : `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`;
                      window.open(navUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="inline-flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-2 rounded-xl text-xs transition"
                    title="Navigate via Google Maps"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="hidden sm:inline">Navigate</span>
                  </button>
                  <Link
                    to={`/listing/${listing.id}`}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
                  >
                    View & Reserve
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
