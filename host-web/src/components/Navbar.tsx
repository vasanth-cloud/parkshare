import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  PlusCircle, 
  LayoutDashboard, 
  KeyRound, 
  ShieldCheck, 
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HostAvatar } from './HostAvatar';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showManageDropdown, setShowManageDropdown] = useState(false);

  return (
    <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-gray-900 dark:text-slate-100 border-b border-gray-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo & Mode */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2 sm:space-x-2.5">
              <img 
                src="/logo.png" 
                alt="ParkShare Logo" 
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-xl bg-emerald-50 dark:bg-slate-800 p-1 border border-emerald-100 dark:border-slate-700 shadow-2xs" 
              />
              <div className="flex items-baseline">
                <span className="font-black text-lg sm:text-xl tracking-tight text-gray-900 dark:text-white">ParkShare</span>
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#0f8b5f] dark:text-emerald-400 ml-1">Host</span>
              </div>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              🏢 Partner Mode
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-6 text-xs font-bold tracking-wide">
              {user && (
                <>
                  {/* Manage Dropdown with Classification */}
                  <div
                    className="relative"
                    onMouseEnter={() => setShowManageDropdown(true)}
                    onMouseLeave={() => setShowManageDropdown(false)}
                  >
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className={`flex items-center space-x-1 py-2 transition-colors cursor-pointer ${
                        location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/create-listing') || location.pathname.startsWith('/pin-verify')
                          ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                          : 'text-gray-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>📋 Manage</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {showManageDropdown && (
                      <div className="absolute top-full left-0 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                        <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Partner Services
                        </div>
                        <Link
                          to="/dashboard"
                          onClick={() => setShowManageDropdown(false)}
                          className="flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                        >
                          <span>🅿️</span>
                          <div className="flex flex-col">
                            <span className="font-bold">Parking Bays</span>
                            <span className="text-[10px] text-gray-400">View & edit listings</span>
                          </div>
                        </Link>
                        <Link
                          to="/create-listing"
                          onClick={() => setShowManageDropdown(false)}
                          className="flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-bold">Add Parking Space</span>
                        </Link>
                        <Link
                          to="/register/driver"
                          onClick={() => setShowManageDropdown(false)}
                          className="flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                        >
                          <span>🧑‍✈️</span>
                          <div className="flex flex-col">
                            <span className="font-bold">Acting Driver</span>
                            <span className="text-[10px] text-gray-400">Manage chauffeur gig</span>
                          </div>
                        </Link>
                        <Link
                          to="/register/car-spa"
                          onClick={() => setShowManageDropdown(false)}
                          className="flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                        >
                          <span>✨</span>
                          <div className="flex flex-col">
                            <span className="font-bold">Car Spa Partner</span>
                            <span className="text-[10px] text-gray-400">Mobile & bay wash</span>
                          </div>
                        </Link>
                        <div className="border-t border-gray-100 dark:border-slate-800 my-1"></div>
                        <Link
                          to="/pin-verify"
                          onClick={() => setShowManageDropdown(false)}
                          className="flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-bold">Check-in PIN</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* KYC Status */}
                  <Link 
                    to="/verification" 
                    className={`flex items-center space-x-1.5 transition-colors ${
                      location.pathname === '/verification' || location.pathname === '/kyc'
                        ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'text-gray-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>KYC</span>
                  </Link>
                </>
              )}
            </div>

            {user ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <HostAvatar 
                  url={user.profile_photo_url} 
                  name={user.full_name} 
                  size="sm" 
                />
                <span className="hidden xl:inline text-xs font-bold text-gray-800 dark:text-slate-200 truncate max-w-[110px]">
                  {user.full_name?.split(' ')[0]}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/auth"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2 rounded-xl shadow-sm transition"
                >
                  Sign In / Register
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};
export default Navbar;
