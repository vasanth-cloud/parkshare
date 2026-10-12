import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Search, Calendar, LogOut, Sun, Moon, Bot, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  onOpenChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenChat }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs dark:shadow-md border-b border-slate-200/90 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Mode Badge (matching Host Panel structure with full Day/Night theme) */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <img
              src="/logo.png"
              alt="ParkShare Logo"
              className="w-10 h-10 rounded-xl shadow-xs group-hover:scale-105 transition-transform bg-white p-0.5 object-contain border border-slate-200 dark:border-slate-700"
            />
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-1">
                <span>ParkShare</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <span>🚗 Driver Mode</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-6 text-xs font-bold tracking-wide">
          <Link to="/" className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            <span>🏠 Services Hub</span>
          </Link>

          <Link to="/parking" className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>🅿️ Find Parking</span>
          </Link>

          <Link to="/services/drivers" className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <span>🧑‍✈️ Acting Drivers</span>
            <span className="text-[9px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-extrabold px-1.5 py-0.2 rounded-full border border-indigo-400/20">NEW</span>
          </Link>

          <Link to="/services/car-spa" className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
            <span>✨ Car Spa</span>
            <span className="text-[9px] bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-extrabold px-1.5 py-0.2 rounded-full border border-cyan-400/20">NEW</span>
          </Link>

          {user && (
            <>
              <Link to="/bookings" className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>My Bookings</span>
              </Link>

              <Link to="/vehicles" className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>My Vehicles</span>
              </Link>
            </>
          )}
        </div>

        {/* User Profile Avatar on Top Right */}
        <div className="flex items-center space-x-2.5 flex-shrink-0">
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

