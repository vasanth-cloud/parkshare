import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Search,
  ChevronRight,
  Zap,
  Wrench,
  FileText,
  Navigation,
  ShieldCheck,
  Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Booking } from '../types';

export const CustomerServicesHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      api.getActiveBooking()
        .then((b) => setActiveBooking(b))
        .catch(() => {});
    }
  }, [user]);

  // Primary 3 Active Services
  const activeServices = [
    {
      id: 'parking',
      title: 'Parking',
      subtitle: 'Find & Reserve',
      iconText: '🅿️',
      route: '/parking',
      badge: 'Active',
      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      activeRing: 'active:bg-emerald-50 dark:active:bg-emerald-950/40',
    },
    {
      id: 'drivers',
      title: 'Acting Drivers',
      subtitle: 'Personal Chauffeur',
      iconText: '🧑‍✈️',
      route: '/services/drivers',
      badge: 'Active',
      colorClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      activeRing: 'active:bg-indigo-50 dark:active:bg-indigo-950/40',
    },
    {
      id: 'car-spa',
      title: 'Car Spa',
      subtitle: 'Wash & Detailing',
      iconText: '✨',
      route: '/services/car-spa',
      badge: 'Active',
      colorClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      activeRing: 'active:bg-cyan-50 dark:active:bg-cyan-950/40',
    },
  ];

  // Expandable Modular Future Services
  const upcomingServices = [
    {
      id: 'ev-charge',
      title: 'EV Charging',
      subtitle: 'Fast DC Hubs',
      iconText: '⚡',
      badge: 'Soon',
    },
    {
      id: 'roadside',
      title: 'Roadside Assist',
      subtitle: 'Towing & Battery',
      iconText: '🛞',
      badge: 'Soon',
    },
    {
      id: 'fastag',
      title: 'FASTag & PUC',
      subtitle: 'Tolls & Renewal',
      iconText: '📄',
      badge: 'Soon',
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('driver')) navigate('/services/drivers');
    else if (q.includes('spa') || q.includes('wash')) navigate('/services/car-spa');
    else navigate(`/parking?area=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 select-none">
      
      {/* Top Native Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 pt-4 pb-3">
        <div className="max-w-md mx-auto space-y-3">
          
          {/* Greeting & Location */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {user ? `Hello, ${user.full_name?.split(' ')[0]}` : 'Welcome to ParkShare'}
              </div>
              <div className="flex items-center space-x-1 font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Bengaluru</span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-black">
              <span>3 Services Ready</span>
            </div>
          </div>

          {/* Clean App Search */}
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2 space-x-2 border border-slate-200/60 dark:border-slate-700/60">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search parking, driver, or wash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </form>

        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto px-4 mt-4 space-y-5">
        
        {/* Active Session Strip (If any) */}
        {activeBooking && (
          <div
            onClick={() => navigate('/bookings')}
            className="bg-slate-900 text-white rounded-2xl p-3 flex items-center justify-between shadow-sm border border-slate-800 cursor-pointer active:scale-[0.99] transition"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
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

        {/* =================================================================== */}
        {/* SERVICES MENU GRID (Clean Native App Tile Layout)                   */}
        {/* =================================================================== */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Select Service
            </h2>
            <span className="text-[11px] font-bold text-slate-500">Tap to open</span>
          </div>

          {/* 3 Active Launch Services Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            {activeServices.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => navigate(service.route)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center transition-all duration-150 active:scale-95 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer ${service.activeRing}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 border ${service.colorClass}`}>
                  {service.iconText}
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  {service.title}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {service.subtitle}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Map Shortcut Banner */}
        <div
          onClick={() => navigate('/parking')}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-3.5 flex items-center justify-between shadow-sm cursor-pointer active:scale-[0.99] transition"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">
              🗺️
            </div>
            <div>
              <h4 className="text-xs font-black">Open Parking Radar Map</h4>
              <p className="text-[10px] text-emerald-100">Live GPS pins & instant slot reservation</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />
        </div>

        {/* =================================================================== */}
        {/* FUTURE EXPANSION SERVICES (Clean Tiles)                             */}
        {/* =================================================================== */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Upcoming Services
            </h3>
            <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
              In Development
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {upcomingServices.map((service) => (
              <div
                key={service.id}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-center opacity-75"
              >
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl mb-1.5 border border-slate-200/50 dark:border-slate-700/50">
                  {service.iconText}
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight">
                  {service.title}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  {service.subtitle}
                </span>
                <span className="mt-1 text-[8px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded">
                  {service.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 flex items-center justify-around text-center text-xs">
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
