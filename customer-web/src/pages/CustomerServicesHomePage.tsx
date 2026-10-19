import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Search,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Car,
  Clock,
  Compass,
  Zap,
  CheckCircle2,
  X,
  KeyRound,
  Shield,
  Star,
  Flame,
  Award
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

  // The 4 Core Mobility Services
  const services = [
    {
      id: 'parking',
      title: 'Parking Radar & Spaces',
      subtitle: 'Find & Reserve Driveway Spaces',
      badge: 'Live Radar',
      iconText:'',
      route: '/parking',
      description: 'Search nearby verified driveway spots, private gates & secure parking slots with live GPS radar navigation & instant digital gate passes.',
      features: ['Live GPS Radar Map', 'Instant Digital Pass & OTP', 'Zero Surge Pricing'],
      theme: {
        border: 'border-emerald-500/30 hover:border-emerald-500',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        button: 'bg-emerald-600 hover:bg-emerald-500 text-white',
        gradient: 'from-emerald-500/10 to-teal-500/10',
      },
      buttonText: 'Book Parking Space',
    },
    {
      id: 'drivers',
      title: 'Acting Drivers Platform',
      subtitle: 'Personal Chauffeur on Demand',
      badge: 'Certified Drivers',
      iconText:'',
      route: '/services/drivers',
      description: 'Certified, background-verified personal chauffeurs to drive your personal car safely for daily city commutes, late-night party returns, or outstation travels.',
      features: ['Manual & Automatic Certified', 'Night & Outstation Trips', 'Admin-set hourly fare'],
      theme: {
        border: 'border-indigo-500/30 hover:border-indigo-500',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-400/20',
        iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        button: 'bg-indigo-600 hover:bg-indigo-500 text-white',
        gradient: 'from-indigo-500/10 to-purple-500/10',
      },
      buttonText: 'Book Acting Driver',
    },
    {
      id: 'car-spa',
      title: 'Car Spa & Detailing',
      subtitle: 'Doorstep & Bay Wash',
      badge: 'Eco Friendly',
      iconText: '',
      route: '/services/car-spa',
      description: 'Professional eco waterless wash, pressure foam bath & interior deep detailing performed at your doorstep or directly at your reserved parking bay.',
      features: ['Doorstep or At Parking Bay', 'Waterless & Foam Treatment', 'Packages from ₹199'],
      theme: {
        border: 'border-cyan-500/30 hover:border-cyan-500',
        badgeBg: 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        button: 'bg-cyan-600 hover:bg-cyan-500 text-white',
        gradient: 'from-cyan-500/10 to-blue-500/10',
      },
      buttonText: 'Schedule Car Spa',
    },
    {
      id: 'rentals',
      title: 'Self-Drive Cars & Bikes',
      subtitle: 'Zero Deposit Hourly & Daily Fleet',
      badge: 'Zero Deposit',
      iconText:'',
      route: '/services/rentals',
      description: 'Sanitized self-drive cars, SUVs, bikes & smart electric scooters available for hourly or multi-day road trips. Keyless instant OTP unlock.',
      features: ['Cars, SUVs & Electric Scooters', 'Doorstep Drop or Hub Pickup', 'Hourly from ₹49 • Zero Deposit'],
      theme: {
        border: 'border-amber-500/30 hover:border-amber-500',
        badgeBg: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        button: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white',
        gradient: 'from-amber-500/10 to-orange-500/10',
      },
      buttonText: 'Rent Cars & Bikes',
    },
  ];

  // Real-time filter: searches among all 4 services!
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
      (q === 'spa' || q === 'wash' || q === 'clean' || q === 'detailing' || q === 'car spa' ? srv.id === 'car-spa' : false) ||
      (q === 'rent' || q === 'rental' || q === 'rentals' || q === 'self drive' || q === 'bike' || q === 'scooter' || q === 'car' ? srv.id === 'rentals' : false)
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
    } else if (q.includes('rent') || q.includes('rental') || q.includes('bike') || q.includes('scooter') || q.includes('self drive')) {
      setSearchError('');
      navigate('/services/rentals');
    } else if (q.includes('park') || q.includes('space') || q.includes('bay') || q.includes('garage') || q.includes('driveway') || q.includes('radar')) {
      setSearchError('');
      navigate('/parking');
    } else {
      setSearchError(`No services match "${searchQuery}". Search is available for Parking, Acting Drivers, Car Spa, and Self-Drive Rentals.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 select-none">
      
      {/* New User Welcome Toast */}
      {isNewUser && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2.5 max-w-lg mx-auto w-full">
            <div className="min-w-0">
              <span className="text-xs font-black block leading-tight">
                Welcome to ParkCo!
              </span>
              <span className="text-[11px] text-emerald-100 block">
                Select any mobility service below to get started. You can switch or combine bookings seamlessly.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Welcome Header Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pt-5 pb-5 shadow-xs sticky top-0 z-30">
        <div className="max-w-xl mx-auto space-y-4">
          
          {/* Greeting & Location */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <span>{user ? `Hello, ${user.full_name?.split(' ')[0]}` : 'Welcome to ParkCo'}</span>
                <span></span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
                <span>All Mobility Services</span>
              </h1>
            </div>

            <div className="flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-black shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>4 Services Live</span>
            </div>
          </div>

          {/* Quick Smart Search */}
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 rounded-2xl px-4 py-3 space-x-2.5 border border-slate-200/80 dark:border-slate-700/80 focus-within:ring-2 focus-within:ring-emerald-500/40 transition shadow-inner">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search services: Parking, Drivers, Car Spa, Rentals..."
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
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black cursor-pointer shrink-0 shadow-xs active:scale-95 transition-all"
              >
                Search
              </button>
            </div>
          </form>

          {/* Search Error warning */}
          {searchError && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center justify-between animate-in fade-in">
              <span>{searchError}</span>
              <button
                type="button"
                onClick={() => setSearchError('')}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline ml-2 shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Main Services Container */}
      <div className="max-w-xl mx-auto px-4 mt-5 space-y-6">
        
        {/* Active Session Strip (If user has an active booking) */}
        {activeBooking && (
          <div
            onClick={() => navigate('/bookings')}
            className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg border border-slate-700/60 cursor-pointer active:scale-[0.99] transition"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                  Active Booking • {activeBooking.space_number || 'Slot A01'}
                </span>
                <span className="text-xs font-bold truncate block text-slate-100">
                  {activeBooking.listing?.title || 'Reserved Space'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
          </div>
        )}

        {/* 4-Item Quick Grid Launcher */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Quick Launch
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Tap to open
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(s.route)}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-95 shadow-xs hover:border-slate-400 dark:hover:border-slate-700 cursor-pointer group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 transition-transform group-hover:scale-110 ${s.theme.iconBg}`}>
                  {s.iconText}
                </div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">
                  {s.id === 'parking' ? 'Parking' : s.id === 'drivers' ? 'Acting Drivers' : s.id === 'car-spa' ? 'Car Spa' : 'Self-Drive'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                  {s.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Service Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Explore All 4 Services
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              Verified Partners Only
            </span>
          </div>

          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              className={`rounded-3xl bg-white dark:bg-slate-900 border ${srv.theme.border} p-5 shadow-xs hover:shadow-xl transition-all duration-300 relative overflow-hidden`}
            >
              {/* Subtle Ambient Background Gradient */}
              <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${srv.theme.gradient} rounded-full blur-3xl pointer-events-none -mr-16 -mt-16`} />

              <div className="relative z-10 space-y-3.5">
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${srv.theme.iconBg} shadow-xs`}>
                      {srv.iconText}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-base font-black text-slate-900 dark:text-white">
                          {srv.title}
                        </h2>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {srv.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${srv.theme.badgeBg}`}>
                    {srv.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {srv.description}
                </p>

                {/* Feature Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {srv.features.map((f, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </span>
                  ))}
                </div>

                {/* CTA Button */}
                <div className="pt-2">
                  <button
                    onClick={() => navigate(srv.route)}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer ${srv.theme.button}`}
                  >
                    <span>{srv.buttonText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Why ParkCo Trust & Guarantee Badge */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl space-y-3 border border-slate-700/80">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black tracking-tight">
              ParkCo Assurance & Safety Guarantee
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every parking space, acting driver, detailing crew, and rental vehicle is 100% verified, police-cleared, and backed by 24x7 customer support.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-300 font-bold">
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <span className="block text-emerald-400 font-black">100%</span>
              <span>Verified</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <span className="block text-cyan-400 font-black">24x7</span>
              <span>Support</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <span className="block text-amber-400 font-black">Instant</span>
              <span>Passes</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
