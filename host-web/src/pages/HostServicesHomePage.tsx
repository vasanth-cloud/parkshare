import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Car,
  KeyRound,
  DollarSign,
  PlusCircle,
  LayoutDashboard,
  Building,
  CheckCircle2,
  Clock,
  Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const HostServicesHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewUser = searchParams.get('new_user') === 'true';

  const { user } = useAuth();
  const [spacesCount, setSpacesCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      api.getMyListings()
        .then((listings) => {
          setSpacesCount(listings.length);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  // The 3 Core Partner Services
  const services = [
    {
      id: 'parking',
      title: 'Parking Space Host',
      subtitle: 'Monetize Driveways, Garages & Lots',
      badge: 'Passive Daily Income',
      iconText: '🅿️',
      route: '/dashboard',
      altRoute: '/create-listing',
      altButtonText: 'Add New Space',
      description: 'List vacant residential driveways, covered carports, basement slots, or commercial bays. Set hourly or monthly pricing, verify driver arrivals with digital PINs, and receive automated bank/UPI payouts.',
      features: ['Set Custom Hourly & Monthly Rates', 'Digital PIN & OTP Gate Verification', 'Automated Daily/Monthly Payouts'],
      theme: {
        border: 'border-emerald-500/30 hover:border-emerald-500',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        button: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      },
      buttonText: 'Manage Spaces',
    },
    {
      id: 'drivers',
      title: 'Acting Driver Partner',
      subtitle: 'Professional Personal Chauffeur',
      badge: 'Flexible Shifts',
      iconText: '🧑‍✈️',
      route: '/register/driver',
      description: 'Register as a certified professional chauffeur. Drive customer personal vehicles for city office commutes, late-night safe drops, or outstation travels with guaranteed hourly earnings and customer tips.',
      features: ['Choose Your Available Days & Hours', 'Daily Bank/UPI Payouts + Tips', 'Manual & Automatic Certified'],
      theme: {
        border: 'border-indigo-500/30 hover:border-indigo-500',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-400/20',
        iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        button: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      },
      buttonText: 'Driver Partner Portal',
    },
    {
      id: 'car-spa',
      title: 'Car Spa & Detailing Partner',
      subtitle: 'Doorstep & Bay Wash Workshop',
      badge: 'High Demand Gigs',
      iconText: '✨',
      route: '/register/car-spa',
      description: 'Offer doorstep eco waterless wash, signature snow foam treatment, deep interior sanitization, and 3M ceramic polishing directly at customer homes or at reserved parking bays.',
      features: ['Doorstep Mobile Van or Reserved Bay Gigs', 'Waterless & Foam Wash Packages', 'Recurring Fleet Subscriptions'],
      theme: {
        border: 'border-cyan-500/30 hover:border-cyan-500',
        badgeBg: 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        button: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      },
      buttonText: 'Car Spa Partner Portal',
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

      {/* Top Welcome Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 pt-5 pb-4 shadow-xs">
        <div className="max-w-md mx-auto space-y-3.5">
          
          {/* Greeting & Mode */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <span>{user ? `Hello, ${user.full_name?.split(' ')[0]}` : 'Welcome to ParkShare'}</span>
                <span>👋</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                Partner Services
              </h1>
            </div>

            <div className="flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-black shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>3 Partner Streams</span>
            </div>
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

          {/* Partner Quick Stats Bar */}
          {user && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Link
                to="/dashboard"
                className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center text-center hover:border-emerald-400 transition"
              >
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {loading ? '...' : `${spacesCount} Bays`}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">My Spaces</span>
              </Link>

              <Link
                to="/earnings"
                className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center text-center hover:border-emerald-400 transition"
              >
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <DollarSign className="w-3 h-3" />
                  <span>Payouts</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Earnings</span>
              </Link>

              <Link
                to="/verification"
                className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center text-center hover:border-emerald-400 transition"
              >
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Status</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">KYC Verified</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Services List */}
      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        
        {/* Section Intro */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Choose How You Want to Earn
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Select any stream to open dashboard or register as a partner
            </p>
          </div>
        </div>

        {/* 3 Core Partner Service Cards */}
        <div className="space-y-3.5">
          {services.map((srv) => (
            <div
              key={srv.id}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border ${srv.theme.border} shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3 relative overflow-hidden group`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border shadow-xs flex-shrink-0 ${srv.theme.iconBg}`}
                  >
                    {srv.iconText}
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mb-1 ${srv.theme.badgeBg}`}
                    >
                      {srv.badge}
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {srv.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {srv.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {srv.description}
              </p>

              {/* Feature Bullets */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                {srv.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(srv.route)}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer ${srv.theme.button}`}
                >
                  <span>{srv.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {srv.altRoute && (
                  <button
                    type="button"
                    onClick={() => navigate(srv.altRoute)}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer shadow-2xs"
                    title={srv.altButtonText}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{srv.altButtonText}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Card: Flexibility Note */}
        <div className="bg-emerald-50/70 dark:bg-slate-900/60 border border-emerald-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-400 flex-shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Multi-Service Partner Flexibility
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              You can host parking spaces, take driving gigs, or run car spa washes under the same verified account.
            </p>
          </div>
        </div>

        {/* Quick Links Footer Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link
            to="/pin-verify"
            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition flex items-center space-x-2 text-xs font-bold shadow-2xs"
          >
            <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Driver Check-in PIN</span>
          </Link>

          <Link
            to="/earnings"
            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition flex items-center space-x-2 text-xs font-bold shadow-2xs"
          >
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Bank & UPI Payouts</span>
          </Link>
        </div>

      </div>
    </div>
  );
};
