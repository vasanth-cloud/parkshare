import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  X,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { HostAvatar } from '../components/HostAvatar';

export const HostServicesHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewUser = searchParams.get('new_user') === 'true';

  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  // The 4 Core Partner Services
  const services = [
    {
      id: 'parking',
      title: 'Parking Space Host',
      shortTitle: 'Parking Host',
      subtitle: 'Monetize driveways, garages & bays',
      badge: 'Driveways & Garages',
      iconText: '🅿️',
      route: '/dashboard',
      actionText: 'Manage Spaces',
      theme: {
        border: 'border-emerald-500/30 hover:border-emerald-500',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        button: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      },
    },
    {
      id: 'drivers',
      title: 'Acting Driver Partner',
      shortTitle: 'Acting Driver',
      subtitle: 'Drive customer cars for city & outstation trips',
      badge: 'Chauffeur Gigs',
      iconText: '🧑‍✈️',
      route: '/register/driver',
      actionText: 'Driver Gigs',
      theme: {
        border: 'border-indigo-500/30 hover:border-indigo-500',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-400/20',
        iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        button: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      },
    },
    {
      id: 'car-spa',
      title: 'Car Spa & Detailing',
      shortTitle: 'Car Spa',
      subtitle: 'Doorstep waterless wash & foam detailing',
      badge: 'Wash & Detailing',
      iconText: '✨',
      route: '/register/car-spa',
      actionText: 'Wash Partner',
      theme: {
        border: 'border-cyan-500/30 hover:border-cyan-500',
        badgeBg: 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        button: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      },
    },
    {
      id: 'rentals',
      title: 'Rental Fleet Partner',
      shortTitle: 'Self-Drive Fleet',
      subtitle: 'List your idle cars or bikes for self-drive',
      badge: 'Vehicle Fleet',
      iconText: '🚗',
      route: '/register/rental',
      actionText: 'Host Vehicles',
      theme: {
        border: 'border-amber-500/30 hover:border-amber-500',
        badgeBg: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        button: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white',
      },
    },
  ];

  // Real-time filter: only searches among partner services!
  const filteredServices = services.filter((srv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      srv.title.toLowerCase().includes(q) ||
      srv.shortTitle.toLowerCase().includes(q) ||
      srv.subtitle.toLowerCase().includes(q) ||
      srv.badge.toLowerCase().includes(q) ||
      srv.actionText.toLowerCase().includes(q) ||
      (q === 'parking' || q === 'park' || q === 'bay' || q === 'bays' || q === 'space' || q === 'spaces' || q === 'driveway' || q === 'garage' ? srv.id === 'parking' : false) ||
      (q === 'driver' || q === 'drivers' || q === 'chauffeur' || q === 'acting' ? srv.id === 'drivers' : false) ||
      (q === 'spa' || q === 'wash' || q === 'clean' || q === 'detailing' || q === 'car spa' ? srv.id === 'car-spa' : false) ||
      (q === 'rent' || q === 'rental' || q === 'fleet' || q === 'bike' || q === 'scooter' || q === 'vehicle' || q === 'car' ? srv.id === 'rentals' : false)
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
      navigate('/register/driver');
    } else if (q.includes('spa') || q.includes('wash') || q.includes('clean') || q.includes('detail')) {
      setSearchError('');
      navigate('/register/car-spa');
    } else if (q.includes('rent') || q.includes('rental') || q.includes('fleet') || q.includes('vehicle')) {
      setSearchError('');
      navigate('/register/rental');
    } else if (q.includes('park') || q.includes('space') || q.includes('bay') || q.includes('garage') || q.includes('driveway')) {
      setSearchError('');
      navigate('/dashboard');
    } else {
      setSearchError(`No services match "${searchQuery}". Search is available for Parking Host, Acting Driver, Car Spa, and Rental Fleet.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 select-none">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/services" className="flex items-center space-x-2.5">
            <img
              src="/logo.png"
              alt="ParkCo Partner"
              className="w-9 h-9 rounded-xl object-contain bg-emerald-500/10 p-0.5 border border-emerald-500/20"
            />
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none">
                ParkCo Partner
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5">
                Host & Partner Network
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {user ? (
              <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-800 pl-2">
                <HostAvatar 
                  url={user.profile_photo_url} 
                  name={user.full_name} 
                  size="sm" 
                />
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/auth');
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* New User Welcome Toast */}
      {isNewUser && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2.5 max-w-2xl mx-auto w-full">
            <span className="text-xl">🎉</span>
            <div className="min-w-0">
              <span className="text-xs font-black block leading-tight">
                Welcome to ParkCo Partner Network!
              </span>
              <span className="text-[11px] text-emerald-100 block">
                Select your partner service below to get started. You can host parking, drive, wash cars, or list rental vehicles.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Welcome Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 pt-5 pb-4 shadow-xs">
        <div className="max-w-2xl mx-auto space-y-3.5">
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <span>{user ? `Hello, ${user.full_name?.split(' ')[0]}` : 'Welcome Partner'}</span>
                <span>👋</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Partner Services Hub
              </h1>
            </div>

            <div className="flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-black shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>4 Partner Streams</span>
            </div>
          </div>

          {/* Service Search Bar */}
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5 space-x-2 border border-slate-200/70 dark:border-slate-700/70 focus-within:ring-2 focus-within:ring-emerald-500/30 transition">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Search services: Parking, Drivers, Car Spa, Fleet Rentals..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchError('');
                }}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-bold"
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
                className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black cursor-pointer shrink-0"
              >
                Go
              </button>
            </div>
          </form>

          {/* Invalid search warning message */}
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

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Earnings Highlight Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 text-white border border-slate-700/80 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Partner Payouts</span>
            </span>
            <h3 className="text-base font-black">
              Earn with Every Space, Trip, Wash or Rental
            </h3>
            <p className="text-xs text-slate-300">
              Direct bank transfers every Tuesday with zero hidden platform deductions.
            </p>
          </div>
          <div className="text-right shrink-0 pl-3">
            <span className="text-xl font-black text-emerald-400 block">₹0</span>
            <span className="text-[10px] text-slate-400 block font-bold">Joining Fee</span>
          </div>
        </div>

        {/* 4 Partner Streams Matrix */}
        <div>
          <div className="px-1 flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Choose Your Partner Portal
            </h2>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Instant Onboarding
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {services.map((srv) => (
              <button
                key={srv.id}
                type="button"
                onClick={() => navigate(srv.route)}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-95 shadow-xs cursor-pointer group"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-2 border shadow-xs group-hover:scale-110 transition-transform duration-200 ${srv.theme.iconBg}`}>
                  {srv.iconText}
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  {srv.shortTitle}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  {srv.actionText}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Action Cards */}
        <div className="space-y-3">
          <div className="px-1">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Service Management & Registration
            </h2>
          </div>

          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              onClick={() => navigate(srv.route)}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border ${srv.theme.border} shadow-2xs hover:shadow-lg transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]`}
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border shadow-2xs shrink-0 group-hover:scale-105 transition-transform ${srv.theme.iconBg}`}
                >
                  {srv.iconText}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {srv.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border hidden sm:inline-block ${srv.theme.badgeBg}`}>
                      {srv.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                    {srv.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors pl-2 shrink-0">
                <span className="hidden sm:inline">{srv.actionText}</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default HostServicesHomePage;
