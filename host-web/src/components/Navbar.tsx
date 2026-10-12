import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, LayoutDashboard, KeyRound, DollarSign, LogOut, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { HostAvatar } from './HostAvatar';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-gray-900 dark:text-slate-100 border-b border-gray-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2 sm:space-x-2.5">
              <img src="/logo.png" alt="ParkShare Logo" className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-xl bg-emerald-50 dark:bg-slate-800 p-1 border border-emerald-100 dark:border-slate-700 shadow-2xs" />
              <div className="flex items-baseline">
                <span className="font-black text-lg sm:text-xl tracking-tight text-gray-900 dark:text-white">ParkShare</span>
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#0f8b5f] dark:text-emerald-400 ml-1">Host</span>
              </div>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Captain Portal
            </span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {user ? (
              <>
                {/* Desktop navigation links */}
                <div className="hidden lg:flex items-center space-x-4 text-sm font-semibold text-gray-600 dark:text-slate-300">
                  <Link to="/dashboard" className="flex items-center space-x-1.5 hover:text-[#0f8b5f] dark:hover:text-emerald-400 transition">
                    <LayoutDashboard className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    <span>Dashboard</span>
                  </Link>

                  <Link to="/create-listing" className="flex items-center space-x-1.5 hover:text-[#0f8b5f] dark:hover:text-emerald-400 transition">
                    <PlusCircle className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    <span>List Space</span>
                  </Link>

                  <Link to="/register/driver" className="flex items-center space-x-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    <span className="text-sm">🧑‍✈️</span>
                    <span>Acting Driver</span>
                  </Link>

                  <Link to="/register/car-spa" className="flex items-center space-x-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition">
                    <span className="text-sm">✨</span>
                    <span>Car Spa</span>
                  </Link>

                  <Link to="/pin-verify" className="flex items-center space-x-1.5 hover:text-[#0f8b5f] dark:hover:text-emerald-400 transition">
                    <KeyRound className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    <span>Check-in PIN</span>
                  </Link>

                  <Link to="/verification" className="flex items-center space-x-1.5 hover:text-[#0f8b5f] dark:hover:text-emerald-400 transition">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>KYC</span>
                  </Link>

                  <Link to="/earnings" className="flex items-center space-x-1.5 hover:text-[#0f8b5f] dark:hover:text-emerald-400 transition">
                    <DollarSign className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    <span>Earnings</span>
                  </Link>
                </div>

                {/* Quick Earnings Pill & Profile Avatar */}
                <div className="flex items-center space-x-1.5 sm:space-x-2 md:border-l md:border-gray-200 dark:md:border-slate-800 md:pl-4">
                  <Link 
                    to="/earnings"
                    className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100/80 border border-emerald-200 dark:border-emerald-800 text-[#0f8b5f] dark:text-emerald-400 text-xs font-black shadow-2xs transition"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-[#0f8b5f] dark:text-emerald-400" />
                    <span className="hidden min-[440px]:inline">Earnings</span>
                  </Link>

                  <div className="flex items-center space-x-2">
                    <HostAvatar 
                      url={user.profile_photo_url} 
                      name={user.full_name} 
                      size="sm" 
                    />
                    <span className="hidden xl:inline text-xs font-bold text-gray-800 dark:text-slate-200 truncate max-w-[120px]">
                      {user.full_name}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      navigate('/auth');
                    }}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link
                  to="/register/driver"
                  className="hidden sm:flex items-center space-x-1 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2.5 py-1.5 rounded-xl transition border border-indigo-200 dark:border-indigo-800"
                >
                  <span>🧑‍✈️ Join as Driver</span>
                </Link>

                <Link
                  to="/register/car-spa"
                  className="hidden sm:flex items-center space-x-1 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 px-2.5 py-1.5 rounded-xl transition border border-cyan-200 dark:border-cyan-800"
                >
                  <span>✨ Partner Car Spa</span>
                </Link>

                <Link
                  to="/auth"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2 rounded-xl shadow-sm transition"
                >
                  Sign In / Sign Up
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
