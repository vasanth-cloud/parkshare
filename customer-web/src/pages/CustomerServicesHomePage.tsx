import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Search,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Car,
  Clock,
  Compass,
  Zap,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Booking } from '../types';

export const CustomerServicesHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewUser = searchParams.get('new_user') === 'true';

  const { user } = useAuth();

  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (user) {
      api.getActiveBooking()
        .then((b) => setActiveBooking(b))
        .catch(() => {});
    }
  }, [user]);

  // The 3 Core Services
  const services = [
    {
      id: 'parking',
      title: 'Parking Radar & Spaces',
      subtitle: 'Find & Reserve Driveway Spaces',
      badge: 'Live Radar',
      iconText: '🅿️',
      route: '/parking',
      description: 'Search nearby verified driveway spots, private gates & secure parking slots with live GPS radar navigation & instant digital gate passes.',
      features: ['Live GPS Radar Map', 'Instant Digital Pass & OTP', 'Zero Surge Pricing'],
      theme: {
        border: 'border-emerald-500/30 hover:border-emerald-500',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        button: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      },
      buttonText: 'Book Parking',
    },
    {
      id: 'drivers',
      title: 'Acting Drivers Platform',
      subtitle: 'Personal Chauffeur on Demand',
      badge: 'Certified Drivers',
      iconText: '🧑‍✈️',
      route: '/services/drivers',
      description: 'Certified, background-verified personal chauffeurs to drive your personal car safely for daily city commutes, late-night party returns, or outstation travels.',
      features: ['Manual & Automatic Certified', 'Night & Outstation Trips', 'Hourly Rates from ₹299'],
      theme: {
        border: 'border-indigo-500/30 hover:border-indigo-500',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-400/20',
        iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        button: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      },
      buttonText: 'Book Acting Driver',
    },
    {
      id: 'car-spa',
      title: 'Car Spa & Detailing',
      subtitle: 'Doorstep & Bay Wash',
      badge: 'Eco Friendly',
      iconText: '✨',
      route: '/services/car-spa',
      description: 'Professional eco waterless wash, pressure foam bath & interior deep detailing performed at your doorstep or directly at your reserved parking bay.',
      features: ['Doorstep or At Parking Bay', 'Waterless & Foam Treatment', 'Packages from ₹199'],
      theme: {
        border: 'border-cyan-500/30 hover:border-cyan-500',
        badgeBg: 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        button: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      },
      buttonText: 'Schedule Car Spa',
    },
  ];

  // Real-time filter: only searches among services!
  const filteredServices = services.filter((srv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      srv.title.toLowerCase().includes(q) ||
      srv.subtitle.toLowerCase().includes(q) ||
      srv.description.toLowerCase().includes(q) ||
      srv.features.some((f) => f.toLowerCase().includes(q)) ||
      (q === 'parking' || q === 'park' || q === 'bay' || q === 'bays' || q === 'space' || q === 'spaces' || q === 'driveway' || q === 'garage' ? srv.id === 'parking' : false) ||
      (q === 'driver' || q === 'drivers' || q === 'chauffeur' || q === 'acting' ? srv.id === 'drivers' : false) ||
      (q === 'spa' || q === 'wash' || q === 'clean' || q === 'detailing' || q === 'car spa' ? srv.id === 'car-spa' : false)
    );
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchError('');
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    if (q.includes('driver') || q.includes('chauffeur') || q.includes('acting')) {
      setSearchError('');
      navigate('/services/drivers');
    } else if (q.includes('spa') || q.includes('wash') || q.includes('clean') || q.includes('detail')) {
      setSearchError('');
      navigate('/services/car-spa');
    } else if (q.includes('park') || q.includes('space') || q.includes('bay') || q.includes('garage') || q.includes('driveway') || q.includes('radar')) {
      setSearchError('');
      navigate('/parking');
    } else {
      // Other search does NOT work before selecting services!
      setSearchError(`No services match "${searchQuery}". Search is only available for our services (Parking, Acting Driver, Car Spa).`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 select-none">
      
      {/* New User Welcome Toast */}
      {isNewUser && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2.5 max-w-md mx-auto w-full">
            <span className="text-xl">🎉</span>
            <div className="min-w-0">
              <span className="text-xs font-black block leading-tight">
                Welcome to ParkCo!
              </span>
              <span className="text-[11px] text-emerald-100 block">
                Select your service below to get started. You can book parking first and return anytime to add other services.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Welcome Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 pt-5 pb-4 shadow-xs">
        <div className="max-w-md mx-auto space-y-3.5">
          
          {/* Greeting & Location */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <span>{user ? `Hello, ${user.full_name?.split(' ')[0]}` : 'Welcome to ParkCo'}</span>
                <span>👋</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                Our Services
              </h1>
            </div>

            <div className="flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-black shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>3 Services Ready</span>
            </div>
          </div>

          {/* Quick Smart Search */}
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5 space-x-2 border border-slate-200/70 dark:border-slate-700/70 focus-within:ring-2 focus-within:ring-emerald-500/30 transition">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search services: Parking, Acting Driver, Car Spa..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchError('');
                }}
                className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchError('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black cursor-pointer flex-shrink-0"
              >
                Go
              </button>
            </div>
          </form>

          {/* Invalid search warning message */}
          {searchError && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center justify-between animate-in fade-in">
              <span>{searchError}</span>
              <button
                type="button"
                onClick={() => setSearchError('')}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline ml-2 flex-shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Main Services Container */}
      <div className="max-w-md mx-auto px-4 mt-4 space-y-5">
        
        {/* Active Session Strip (If user has an active booking) */}
        {activeBooking && (
          <div
            onClick={() => navigate('/bookings')}
            className="bg-slate-900 text-white rounded-2xl p-3.5 flex items-center justify-between shadow-md border border-slate-800 cursor-pointer active:scale-[0.99] transition"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider block">
                  Active Booking • {activeBooking.space_number || 'Slot A01'}
                </span>
                <span className="text-xs font-bold truncate block text-slate-200">
                  {activeBooking.listing?.title || 'Reserved Space'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
          </div>
        )}

        {/* Quick Service Launcher */}
        {filteredServices.length > 0 && (
          <div className={`grid ${filteredServices.length === 1 ? 'grid-cols-1' : filteredServices.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2.5`}>
            {filteredServices.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(s.route)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center transition-all duration-150 active:scale-95 shadow-xs hover:border-slate-400 dark:hover:border-slate-700 cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-1.5 border ${s.theme.iconBg}`}>
                  {s.iconText}
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  {s.id === 'parking' ? 'Parking' : s.id === 'drivers' ? 'Drivers' : 'Car Spa'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {s.id === 'parking' ? 'Reserve' : s.id === 'drivers' ? 'Hire' : 'Book'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* If no services match the query */}
        {filteredServices.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-xs animate-in fade-in">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-xl border border-amber-200 dark:border-amber-800/60">
              🔍
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                No Services Match "{searchQuery}"
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Before selecting a service, search only finds our available services (Parking, Acting Driver, Car Spa). Other searches do not work here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchError('');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Show All Services
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* THE 3 CORE SERVICES (Clean, full-featured cards with back guidance) */}
        {/* =================================================================== */}
        {filteredServices.length > 0 && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  Available Services
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Book parking first, then return anytime to book other services
                </p>
              </div>
            </div>

            {/* Service 1: Parking Radar & Spaces */}
            {filteredServices.some((s) => s.id === 'parking') && (
              <div
                onClick={() => navigate('/parking')}
                className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/30 p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl">
                  🅿️
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Parking Radar & Spaces
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Live GPS Radar & Instant Gate Pass
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ● Active
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              Find & reserve verified private driveway spots, society parking & secured garage bays with live turn-by-turn navigation.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                🗺️ Live Radar Map
              </span>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                ⚡ Instant Gate Pass
              </span>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                🛡️ Zero Surge
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Tap to find & book parking
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/parking');
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>Book Parking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Service 2: Acting Drivers */}
        {filteredServices.some((s) => s.id === 'drivers') && (
          <div
            onClick={() => navigate('/services/drivers')}
            className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-indigo-500/30 p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-13 h-13 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl">
                  🧑‍✈️
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Acting Drivers Platform
                  </h3>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    Personal Chauffeurs on Demand
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                ● Active
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              Certified, background-verified personal drivers to drive your own car safely for city commutes, safe night party drops, or outstation trips.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                🚗 Manual & Automatic
              </span>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                🌙 Night & City Drops
              </span>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                💰 From ₹299
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Tap to hire personal driver
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/services/drivers');
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>Book Driver</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

          {/* Service 3: Car Spa & Detailing */}
          {filteredServices.some((s) => s.id === 'car-spa') && (
            <div
              onClick={() => navigate('/services/car-spa')}
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-cyan-500/30 p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-13 h-13 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl">
                    ✨
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Car Spa & Detailing
                    </h3>
                    <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                      Doorstep & In-Bay Eco Wash
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  ● Active
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                Professional eco waterless wash, foam pressure bath & interior deep detailing while your car is parked at your doorstep or reserved space.
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                  💧 Waterless & Pressure Wash
                </span>
                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                  🧼 Doorstep or At Bay
                </span>
                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                  💎 From ₹199
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Tap to schedule car wash
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/services/car-spa');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <span>Schedule Spa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          </div>
        )}

        {/* Security and Trust Badges */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 flex items-center justify-around text-center text-xs">
          <div className="space-y-0.5">
            <div className="text-base">🛡️</div>
            <div className="font-black text-[11px] text-slate-800 dark:text-slate-200">Verified</div>
            <div className="text-[9px] text-slate-400">IDs & Spots</div>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-0.5">
            <div className="text-base">🔐</div>
            <div className="font-black text-[11px] text-slate-800 dark:text-slate-200">OTP Release</div>
            <div className="text-[9px] text-slate-400">Secure handover</div>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-0.5">
            <div className="text-base">💳</div>
            <div className="font-black text-[11px] text-slate-800 dark:text-slate-200">Zero Surge</div>
            <div className="text-[9px] text-slate-400">Flat pricing</div>
          </div>
        </div>

      </div>

    </div>
  );
};
