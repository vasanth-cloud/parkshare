import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  LogOut,
  X,
  LayoutDashboard,
  ShieldAlert,
  Users,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminServicesHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  // The 3 Core Platform Services for Admin Moderation & Operations
  const services = [
    {
      id: 'parking',
      title: 'Parking Management & Space Approvals',
      shortTitle: 'Parking Approvals',
      subtitle: 'Physical GPS verification, space approvals & radar bays',
      badge: 'Spaces & Moderation',
      iconText: '🅿️',
      route: '/approvals',
      actionText: 'Moderate Spaces',
      features: ['Geo-Fenced GPS Verification', 'Multi-Angle Photos', 'Physical Dossier Audit'],
      theme: {
        border: 'border-emerald-500/30 hover:border-emerald-500',
        badgeBg: 'bg-emerald-950 text-emerald-400 border-emerald-800',
        iconBg: 'bg-emerald-950/80 text-emerald-400 border-emerald-800',
        button: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      },
    },
    {
      id: 'drivers',
      title: 'Acting Drivers Fleet & Dispatch',
      shortTitle: 'Acting Drivers',
      subtitle: 'Chauffeur verification, DL checks, gearbox eligibility & dispatch',
      badge: 'Fleet & Dispatch',
      iconText: '🧑‍✈️',
      route: '/drivers',
      actionText: 'Manage Drivers',
      features: ['Driving License OCR & KYC', 'Manual & Automatic Badges', 'Real-Time Dispatch'],
      theme: {
        border: 'border-indigo-500/30 hover:border-indigo-500',
        badgeBg: 'bg-indigo-950 text-indigo-400 border-indigo-800',
        iconBg: 'bg-indigo-950/80 text-indigo-400 border-indigo-800',
        button: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      },
    },
    {
      id: 'car-spa',
      title: 'Car Spa & Detailing Hubs Console',
      shortTitle: 'Car Spas',
      subtitle: 'Doorstep mobile vans, workshop bays, packages & slot scheduling',
      badge: 'Bays & Detailers',
      iconText: '✨',
      route: '/car-spas',
      actionText: 'Manage Car Spas',
      features: ['Doorstep & In-Bay Centers', 'Eco-Wash Capacity', 'Custom Detailing Packages'],
      theme: {
        border: 'border-cyan-500/30 hover:border-cyan-500',
        badgeBg: 'bg-cyan-950 text-cyan-400 border-cyan-800',
        iconBg: 'bg-cyan-950/80 text-cyan-400 border-cyan-800',
        button: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      },
    },
  ];

  // Real-time filter: only searches among services!
  const filteredServices = services.filter((srv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      srv.title.toLowerCase().includes(q) ||
      srv.shortTitle.toLowerCase().includes(q) ||
      srv.subtitle.toLowerCase().includes(q) ||
      srv.badge.toLowerCase().includes(q) ||
      srv.actionText.toLowerCase().includes(q) ||
      srv.features.some((f) => f.toLowerCase().includes(q)) ||
      (q === 'parking' || q === 'park' || q === 'bay' || q === 'bays' || q === 'space' || q === 'spaces' || q === 'driveway' || q === 'garage' || q === 'approval' || q === 'approvals' || q === 'radar' || q === 'listing' ? srv.id === 'parking' : false) ||
      (q === 'driver' || q === 'drivers' || q === 'chauffeur' || q === 'acting' || q === 'fleet' || q === 'chauffeurs' ? srv.id === 'drivers' : false) ||
      (q === 'spa' || q === 'wash' || q === 'clean' || q === 'detailing' || q === 'car spa' || q === 'workshop' || q === 'detail' ? srv.id === 'car-spa' : false)
    );
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchError('');
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    if (q.includes('driver') || q.includes('chauffeur') || q.includes('acting') || q.includes('fleet')) {
      setSearchError('');
      navigate('/drivers');
    } else if (q.includes('spa') || q.includes('wash') || q.includes('clean') || q.includes('detail') || q.includes('workshop')) {
      setSearchError('');
      navigate('/car-spas');
    } else if (q.includes('park') || q.includes('space') || q.includes('bay') || q.includes('garage') || q.includes('driveway') || q.includes('approval') || q.includes('listing')) {
      setSearchError('');
      navigate('/approvals');
    } else {
      // Other search does NOT work before selecting services!
      setSearchError(`No services match "${searchQuery}". Search is only available for platform services (Parking, Acting Driver, Car Spa).`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 select-none">
      
      {/* Standalone Brand Header on Admin Home Page (Global Navbar is hidden before choosing service) */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <img 
              src="/logo.png" 
              alt="ParkCo Logo" 
              className="h-8 w-8 object-contain rounded-xl bg-slate-800 p-1 border border-slate-700 shadow-xs" 
            />
            <div className="flex items-baseline">
              <span className="font-black text-lg tracking-tight text-white">ParkCo</span>
              <span className="font-extrabold text-lg tracking-tight text-emerald-400 ml-1">Console</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Superadmin
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center font-bold text-xs text-white">
                    {user.full_name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold text-slate-200">
                    {user.full_name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/auth');
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">

        {/* Welcome & Service Selector Banner */}
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start space-x-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Superadmin Operational Hub
            </span>
            <span className="text-emerald-400">● 3 Platforms Live</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Platform Services Console
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Choose a service below to moderate space applications, verify acting drivers, or supervise car spa centers.
          </p>
        </div>

        {/* Dedicated Service-Only Search Bar */}
        <div className="space-y-2">
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-slate-900 rounded-2xl px-4 py-3 space-x-2.5 border border-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500/50 transition">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search services: Parking, Acting Driver, Car Spa..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchError('');
                }}
                className="w-full bg-transparent text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchError('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-200 flex-shrink-0 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer flex-shrink-0 transition active:scale-95 shadow-xs"
              >
                Go
              </button>
            </div>
          </form>

          {/* Invalid Search Feedback Notice */}
          {searchError && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-xs font-semibold text-amber-300 flex items-center justify-between animate-in fade-in">
              <span>{searchError}</span>
              <button
                type="button"
                onClick={() => setSearchError('')}
                className="text-xs font-bold text-amber-400 hover:underline ml-2 flex-shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Available Platform Services
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              Select to Enter
            </span>
          </div>
          {searchQuery && (
            <span className="text-xs font-bold text-emerald-400">
              {filteredServices.length} matching
            </span>
          )}
        </div>

        {/* If no services match the query */}
        {filteredServices.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-md animate-in fade-in">
            <div className="w-14 h-14 bg-amber-950/40 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-amber-800/60">
              🔍
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                No Services Match "{searchQuery}"
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Before selecting a service, search only finds our 3 platform services (Parking, Acting Driver, Car Spa). Other searches do not work here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchError('');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
            >
              Show All Services
            </button>
          </div>
        ) : (
          <>
            {/* 1. Quick Service Icon Launcher Grid (3 Icons) */}
            <div className={`grid ${filteredServices.length === 1 ? 'grid-cols-1' : filteredServices.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
              {filteredServices.map((srv) => (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => navigate(srv.route)}
                  className="flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-900 border border-slate-800 text-center transition-all duration-150 active:scale-95 shadow-sm hover:border-emerald-500/60 cursor-pointer group"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-2.5 border shadow-sm group-hover:scale-110 transition-transform duration-200 ${srv.theme.iconBg}`}>
                    {srv.iconText}
                  </div>
                  <span className="text-xs font-black text-white leading-tight">
                    {srv.shortTitle}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {srv.actionText}
                  </span>
                </button>
              ))}
            </div>

            {/* 2. Detailed Service Operations Cards */}
            <div className="space-y-3.5 pt-2">
              {filteredServices.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => navigate(srv.route)}
                  className={`bg-slate-900 rounded-3xl p-5 border ${srv.theme.border} shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer group active:scale-[0.99]`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4 min-w-0">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform ${srv.theme.iconBg}`}
                      >
                        {srv.iconText}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-black text-white tracking-tight truncate">
                            {srv.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border hidden sm:inline-block ${srv.theme.badgeBg}`}>
                            {srv.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {srv.subtitle}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {srv.features.map((feat, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold bg-slate-950 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-800"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end sm:justify-center pl-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(srv.route);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black ${srv.theme.button} flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer`}
                      >
                        <span>{srv.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 3. System Utilities Strip (Overview, Disputes, Users) */}
        <div className="bg-slate-900/80 rounded-3xl p-4 border border-slate-800/80 mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400 text-center sm:text-left">
            <span className="text-base">⚙️</span>
            <div>
              <span className="font-bold text-slate-200">System Utilities: </span>
              <span className="text-slate-400">Financial KPIs, Disputes & User Directories</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              to="/dashboard"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition flex items-center space-x-1 text-[11px] border border-slate-700"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Overview</span>
            </Link>
            <Link
              to="/disputes"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition flex items-center space-x-1 text-[11px] border border-slate-700"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Disputes</span>
            </Link>
            <Link
              to="/users"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition flex items-center space-x-1 text-[11px] border border-slate-700"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Users</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
