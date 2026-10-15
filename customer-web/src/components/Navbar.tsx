import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, ChevronDown, LayoutGrid, Sparkles, ArrowRight, Car, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  onOpenChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenChat }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showManageDropdown, setShowManageDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowManageDropdown(false);
      }
    };
    if (showManageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showManageDropdown]);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white shadow-xs dark:shadow-md border-b border-slate-200/90 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Mode Badge */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <img
              src="/logo.png"
              alt="ParkCo Logo"
              className="w-10 h-10 rounded-xl shadow-xs group-hover:scale-105 transition-transform bg-white p-0.5 object-contain border border-slate-200 dark:border-slate-700"
            />
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-1">
                <span>ParkCo</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <span>🚗 Driver Mode</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-8 text-xs font-bold tracking-wide">
          <Link to="/" className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            <span>🅿️ Find Parking</span>
          </Link>

          <Link
            to="/services"
            className={`flex items-center space-x-1.5 transition-colors py-2 ${
              location.pathname.startsWith('/services')
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>✨ Services</span>
          </Link>

          <Link
            to="/bookings"
            className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2"
          >
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>📋 Bookings</span>
          </Link>

          <Link
            to="/vehicles"
            className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2"
          >
            <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>🚗 Vehicles</span>
          </Link>

          <Link to="/profile" className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            <span>👤 Profile</span>
          </Link>
        </div>

        {/* Right Section: Manage Services Dropdown + User Avatar */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          
          {/* Manage Services Dropdown (Visible on both Mobile & Desktop) */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setShowManageDropdown(true)}
            onMouseLeave={() => setShowManageDropdown(false)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowManageDropdown((prev) => !prev);
              }}
              className={`flex items-center space-x-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl transition-all cursor-pointer font-bold text-xs ${
                location.pathname.startsWith('/services') || location.pathname.startsWith('/vehicles')
                  ? 'text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shadow-2xs'
                  : 'text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="hidden sm:inline">Manage </span>
              <span>Services</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showManageDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showManageDropdown && (
              <div className="absolute top-full right-0 mt-2 w-64 sm:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                <div className="px-3.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Mobility Services</span>
                  <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-full">Driver Side</span>
                </div>

                <Link
                  to="/"
                  onClick={() => setShowManageDropdown(false)}
                  className="flex items-center space-x-3 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition rounded-lg mx-1"
                >
                  <span className="text-xl flex-shrink-0">🅿️</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Find Parking</span>
                    <span className="text-[10px] text-gray-400">Live GPS radar & driveway booking</span>
                  </div>
                </Link>

                <Link
                  to="/services/drivers"
                  onClick={() => setShowManageDropdown(false)}
                  className="flex items-center space-x-3 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition rounded-lg mx-1"
                >
                  <span className="text-xl flex-shrink-0">🧑‍✈️</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Acting Drivers</span>
                    <span className="text-[10px] text-gray-400">Verified personal chauffeurs</span>
                  </div>
                </Link>

                <Link
                  to="/services/car-spa"
                  onClick={() => setShowManageDropdown(false)}
                  className="flex items-center space-x-3 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition rounded-lg mx-1"
                >
                  <span className="text-xl flex-shrink-0">✨</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Car Spa & Detailing</span>
                    <span className="text-[10px] text-gray-400">Waterless eco wash at bay or door</span>
                  </div>
                </Link>

                <Link
                  to="/services/rentals"
                  onClick={() => setShowManageDropdown(false)}
                  className="flex items-center space-x-3 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition rounded-lg mx-1"
                >
                  <span className="text-xl flex-shrink-0">🚗</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Self-Drive Rentals</span>
                    <span className="text-[10px] text-gray-400">Zero deposit cars, SUVs & bikes</span>
                  </div>
                </Link>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                
                <div className="px-3.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Garage & Passes
                </div>

                <Link
                  to="/vehicles"
                  onClick={() => setShowManageDropdown(false)}
                  className="flex items-center space-x-3 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition rounded-lg mx-1"
                >
                  <span className="text-xl flex-shrink-0">🚗</span>
                  <div className="flex flex-col">
                    <span className="font-bold">My Vehicles</span>
                    <span className="text-[10px] text-gray-400">Manage garage & HSRP plates</span>
                  </div>
                </Link>

                <Link
                  to="/bookings"
                  onClick={() => setShowManageDropdown(false)}
                  className="flex items-center space-x-3 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition rounded-lg mx-1"
                >
                  <span className="text-xl flex-shrink-0">📋</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Active Passes & Trips</span>
                    <span className="text-[10px] text-gray-400">Gate PIN passes & trip history</span>
                  </div>
                </Link>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1"></div>
                
                <Link
                  to="/services"
                  onClick={() => setShowManageDropdown(false)}
                  className="flex items-center justify-between px-3.5 py-2 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 rounded-xl mx-1 transition"
                >
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>All Services Hub</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          {user ? (
            <Link
              to="/profile"
              className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 p-1 sm:px-2.5 sm:py-1 rounded-full border border-slate-200/90 dark:border-slate-700 transition shadow-xs cursor-pointer group"
              title="My Profile"
            >
              <UserAvatar user={user} size="sm" showBorder className="ring-2 ring-emerald-500/50 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden sm:inline">
                {user.full_name?.split(' ')[0]}
              </span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center space-x-1"
            >
              <span>Sign In</span>
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
};

