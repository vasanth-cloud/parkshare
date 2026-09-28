import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Clock, Star, Zap, Shield, Navigation, Car, List, Map as MapIcon, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { ParkingListing, Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import { ActiveParkingCard } from '../components/ActiveParkingCard';

export const CustomerLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active parking state
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  // Search state
  const [city, setCity] = useState('Bengaluru');
  const [area, setArea] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [vehicleType, setVehicleType] = useState('CAR');

  // Listings & View State
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);

  // Live Location & GPS state
  const [liveLocationName, setLiveLocationName] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const fetchListings = async (searchCity = city, searchArea = area) => {
    setLoading(true);
    try {
      const data = await api.searchListings({
        city: searchCity || undefined,
        area: searchArea || undefined,
        vehicle_type: vehicleType || undefined,
      });
      setListings(data);
      if (data.length > 0) {
        setSelectedListingId(data[0].id);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveBooking = async () => {
    if (!user) {
      setActiveBooking(null);
      return;
    }
    try {
      const data = await api.getActiveBooking();
      setActiveBooking(data);
    } catch (err) {
      console.error('Error fetching active booking:', err);
    }
  };

  useEffect(() => {
    fetchListings();
    checkActiveBooking();
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings(city, area);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLoading(true);
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

          const searchRes = await api.searchListings({
            lat: latitude,
            lng: longitude,
            radius_km: 10,
          });
          setListings(searchRes);
          if (searchRes.length > 0) setSelectedListingId(searchRes[0].id);
        } catch (e) {
          console.error('GPS Search Error', e);
        } finally {
          setLoading(false);
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        alert('Geolocation error: ' + err.message + '. Please check GPS permissions.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 1. Instant Utility Search Box Header */}
      <section className="bg-emerald-900 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md border-b border-emerald-800">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Where do you need parking?
            </h1>

            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-200 bg-emerald-800/80 hover:bg-emerald-800 px-3 py-1.5 rounded-xl transition border border-emerald-700 w-fit disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 text-emerald-400 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Acquiring GPS Signal...' : 'Use GPS Current Location'}</span>
            </button>
          </div>

          {liveLocationName && (
            <div className="bg-emerald-800/90 border border-emerald-600 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white text-xs shadow-md">
              <div className="flex items-center space-x-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                <MapPin className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <div>
                  <span className="text-emerald-300 text-[10px] uppercase font-bold block">Live Detected Location</span>
                  <span className="font-extrabold text-sm text-white">{liveLocationName}</span>
                  {gpsCoords && <span className="text-[11px] text-emerald-200 ml-2 font-mono">({gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)})</span>}
                </div>
              </div>
              <span className="bg-emerald-400 text-slate-950 font-black px-3 py-1 rounded-xl text-[11px] shadow-sm">
                📍 Live GPS Active
              </span>
            </div>
          )}

          {/* What do you need? Product Selector */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => navigate('/search?product=HOURLY')}
              className="p-3 rounded-2xl border text-left transition bg-emerald-500 text-slate-950 font-extrabold border-emerald-400 shadow-md hover:bg-emerald-400"
            >
              <div className="flex items-center space-x-1.5 text-xs uppercase tracking-wider font-black">
                <Zap className="w-4 h-4 text-amber-950" />
                <span>⚡ Hourly</span>
              </div>
              <p className="text-[11px] text-slate-900 font-semibold mt-0.5">Short visit, meetings, meals</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/search?product=DAILY')}
              className="p-3 rounded-2xl border text-left transition bg-emerald-800/80 text-emerald-100 border-emerald-700 hover:bg-emerald-800"
            >
              <div className="flex items-center space-x-1.5 text-xs uppercase tracking-wider font-extrabold">
                <Calendar className="w-4 h-4 text-blue-300" />
                <span>📅 Daily / Multi-day</span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">Full day, office visit, tourist</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/search?product=MONTHLY')}
              className="p-3 rounded-2xl border text-left transition bg-emerald-800/80 text-emerald-100 border-emerald-700 hover:bg-emerald-800"
            >
              <div className="flex items-center space-x-1.5 text-xs uppercase tracking-wider font-extrabold">
                <Clock className="w-4 h-4 text-emerald-300" />
                <span>🏠 Monthly Plan</span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">24/7 or Commuter Mon-Fri</p>
            </button>
          </div>

          {/* Search Inputs Card */}
          <form onSubmit={handleSearchSubmit} className="bg-white rounded-2xl p-4 shadow-xl text-gray-900 grid grid-cols-1 md:grid-cols-12 gap-3 items-end border border-emerald-100">
            {/* City */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">City</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-emerald-600" />
                <input
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Area / Landmark */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Search Area / Landmark</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-600" />
                <input
                  type="text"
                  placeholder="e.g. Indiranagar, MG Road"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Date */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Start & End Time */}
            <div className="md:col-span-2 grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-1.5 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-1.5 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition text-xs flex items-center justify-center space-x-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Find Parking</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Active Parking Screen Banner */}
      {activeBooking && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-4">
          <ActiveParkingCard
            booking={activeBooking}
            onRefresh={() => {
              checkActiveBooking();
              fetchListings();
            }}
          />
        </div>
      )}

      {/* 2. Main Marketplace View (List + Interactive Map) */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full space-y-4">
        {/* Controls Bar */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm text-xs">
          <span className="font-bold text-gray-700">
            {loading ? 'Searching available parking...' : `${listings.length} Parking Spot(s) Available in ${city || 'Location'}`}
          </span>

          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 ${
                viewMode === 'split' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split View</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 ${
                viewMode === 'list' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List Only</span>
            </button>

            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 ${
                viewMode === 'map' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 text-sm">Searching parking spaces nearby...</div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 space-y-3">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-bold text-gray-900">No Parking Spaces Found in "{city}"</h3>
            <p className="text-sm text-gray-500">Try changing the city or area in the search bar above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
            {/* List Column */}
            {(viewMode === 'split' || viewMode === 'list') && (
              <div className={`${viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-4 overflow-y-auto max-h-[700px] pr-1`}>
                {listings.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedListingId(l.id)}
                    className={`bg-white rounded-2xl p-4 border transition cursor-pointer flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${
                      selectedListingId === l.id
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                        : 'border-emerald-100 hover:border-emerald-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={l.images[0]?.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=300&q=80'}
                        alt={l.title}
                        className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            {l.parking_type}
                          </span>
                          <span className="text-xs text-amber-600 font-bold flex items-center space-x-0.5">
                            <Star className="w-3 h-3 fill-amber-500" />
                            <span>{l.average_rating || '4.9'}</span>
                          </span>
                        </div>

                        <h3 className="font-extrabold text-base text-gray-900 line-clamp-1">{l.title}</h3>

                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="line-clamp-1">{l.approximate_address}</span>
                        </p>

                        <div className="flex flex-wrap gap-1 pt-1 text-[11px] font-medium text-gray-600">
                          {l.is_covered && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Covered</span>}
                          {l.has_ev_charging && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">EV Charging</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col justify-between items-end w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Hourly Rate</span>
                        <span className="text-xl font-extrabold text-emerald-800">₹{l.pricing_rule?.hourly_price || 40}<span className="text-xs font-normal text-gray-500">/hr</span></span>
                      </div>

                      <Link
                        to={`/listing/${l.id}`}
                        className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-sm flex items-center space-x-1"
                      >
                        <span>Reserve</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Interactive Map Column */}
            {(viewMode === 'split' || viewMode === 'map') && (
              <div className={`${viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'} bg-slate-900 rounded-3xl overflow-hidden border border-emerald-900 relative min-h-[450px] flex flex-col justify-between p-6 text-white shadow-xl`}>
                <div className="flex justify-between items-center z-10">
                  <div className="bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 border border-slate-700 flex items-center space-x-2">
                    <MapIcon className="w-4 h-4 text-emerald-400" />
                    <span>Interactive Map Canvas ({city})</span>
                  </div>

                  <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-full">
                    GPS Active
                  </span>
                </div>

                {/* Map Pins Simulation */}
                <div className="relative w-full h-80 my-4 bg-slate-950/80 rounded-2xl border border-slate-800/60 p-4 flex flex-wrap items-center justify-around gap-4 overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>

                  {listings.map((l, idx) => (
                    <div
                      key={l.id}
                      onClick={() => setSelectedListingId(l.id)}
                      className={`z-10 cursor-pointer transform hover:scale-110 transition p-2.5 rounded-2xl shadow-xl flex items-center space-x-2 border ${
                        selectedListingId === l.id
                          ? 'bg-emerald-600 text-white border-white ring-4 ring-emerald-500/40 scale-105'
                          : 'bg-slate-900 text-emerald-300 border-emerald-700 hover:bg-slate-800'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="font-extrabold text-xs">📍 ₹{l.pricing_rule?.hourly_price || 40}/hr</span>
                    </div>
                  ))}
                </div>

                {selectedListingId && (
                  <div className="bg-slate-800/95 backdrop-blur-md p-4 rounded-2xl border border-emerald-800/80 flex items-center justify-between text-xs z-10">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Selected Pin</span>
                      <span className="font-bold text-white text-sm">
                        {listings.find((l) => l.id === selectedListingId)?.title}
                      </span>
                      <span className="text-emerald-400 block font-semibold mt-0.5">
                        ₹{listings.find((l) => l.id === selectedListingId)?.pricing_rule?.hourly_price || 40}/hr • {listings.find((l) => l.id === selectedListingId)?.approximate_address}
                      </span>
                    </div>

                    <Link
                      to={`/listing/${selectedListingId}`}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl transition text-xs"
                    >
                      Reserve This Spot
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
