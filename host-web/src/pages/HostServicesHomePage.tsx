import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  Sun,
  Moon,
  LogOut
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

  // The 3 Core Partner Services
  const services = [
    {
      id: 'parking',
      title: 'Parking Space Host',
      shortTitle: 'Parking Host',
      subtitle: 'Monetize driveways, garages & bays',
      badge: 'Driveways & Bays',
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
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('driver') || q.includes('chauffeur')) {
      navigate('/register/driver');
    } else if (q.includes('spa') || q.includes('wash') || q.includes('clean')) {
      navigate('/register/car-spa');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 select-none">
      
      {/* Standalone Brand Header on Home Page (Global Navbar is hidden before choosing service) */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 sticky top-0 z-20 transition-colors">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            <img 
              src="/logo.png" 
              alt="ParkShare Logo" 
              className="h-8 w-8 object-contain rounded-xl bg-emerald-50 dark:bg-slate-800 p-1 border border-emerald-100 dark:border-slate-700 shadow-2xs" 
            />
            <div className="flex items-baseline">
              <span className="font-black text-lg tracking-tight text-gray-900 dark:text-white">ParkShare</span>
              <span className="font-extrabold text-lg tracking-tight text-[#0f8b5f] dark:text-emerald-400 ml-1">Host</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Partner
            </span>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-xl text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {user ? (
              <div className="flex items-center space-x-2 pl-1.5 border-l border-slate-200 dark:border-slate-800">
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
                  className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition"
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
          <div className="flex items-center space-x-2.5 max-w-md mx-auto w-full">
            <span className="text-xl">🎉</span>
            <div className="min-w-0">
              <span className="text-xs font-black block leading-tight">
                Welcome to ParkShare Partner Network!
              </span>
              <span className="text-[11px] text-emerald-100 block">
                Select your partner service below to get started. You can manage your parking space first, and return anytime to register as an Acting Driver or Car Spa Partner.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Welcome Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 pt-5 pb-4 shadow-xs">
        <div className="max-w-md mx-auto space-y-3">
          
          {/* Greeting */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <span>{user ? `Hello, ${user.full_name?.split(' ')[0]}` : 'Welcome to ParkShare'}</span>
              <span>👋</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
              Partner Services
            </h1>
          </div>

          {/* Quick Smart Search */}
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5 space-x-2.5 border border-slate-200/70 dark:border-slate-700/70 focus-within:ring-2 focus-within:ring-emerald-500/30 transition">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search services: Parking bays, Driver, Car Spa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-medium"
              />
              <button
                type="submit"
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex-shrink-0"
              >
                Go
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* Main Content: Services Displayed as Icons */}
      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">
        
        {/* Section Heading */}
        <div className="px-1">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Choose a Service
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Select your partner stream to open portal
          </p>
        </div>

        {/* 1. Quick Service Icon Launcher Grid (3 Icons) */}
        <div className="grid grid-cols-3 gap-2.5">
          {services.map((srv) => (
            <button
              key={srv.id}
              type="button"
              onClick={() => navigate(srv.route)}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center transition-all duration-150 active:scale-95 shadow-xs hover:border-emerald-500 dark:hover:border-emerald-500 cursor-pointer group"
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

        {/* 2. Sleek Icon Action Cards */}
        <div className="space-y-2.5 pt-1">
          {services.map((srv) => (
            <div
              key={srv.id}
              onClick={() => navigate(srv.route)}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 border ${srv.theme.border} shadow-2xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]`}
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border shadow-2xs flex-shrink-0 group-hover:scale-105 transition-transform ${srv.theme.iconBg}`}
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
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                    {srv.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 text-xs font-bold text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors pl-2 flex-shrink-0">
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
