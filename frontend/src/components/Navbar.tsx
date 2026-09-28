import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShieldCheck, LogOut, PlusCircle, LayoutDashboard, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isCaptainRoute = location.pathname.startsWith('/captain') || location.pathname.startsWith('/host');

  return (
    <nav className="sticky top-0 z-50 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Mode Badge */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <img
              src="/logo.png"
              alt="ParkShare Logo"
              className="w-10 h-10 rounded-xl shadow-md group-hover:scale-105 transition-transform bg-white p-0.5"
            />
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white flex items-center space-x-1">
                <span>ParkShare</span>
              </span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                isCaptainRoute ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {isCaptainRoute ? '⚡ Captain Mode' : '🚗 Driver Mode'}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-6 text-xs font-bold tracking-wide">
          {!isCaptainRoute ? (
            <>
              <Link to="/search" className="flex items-center space-x-1.5 hover:text-emerald-400 transition-colors">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>Find Parking</span>
              </Link>
              <Link to="/dashboard" className="flex items-center space-x-1.5 hover:text-emerald-400 transition-colors">
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <span>My Bookings & Passes</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/captain" className="flex items-center space-x-1.5 hover:text-amber-400 transition-colors">
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                <span>Captain Dashboard</span>
              </Link>
              <Link to="/captain/spaces/new" className="flex items-center space-x-1.5 text-amber-400 hover:text-amber-300 font-extrabold transition-colors">
                <PlusCircle className="w-4 h-4" />
                <span>List Parking Space</span>
              </Link>
            </>
          )}

          {hasRole('ADMIN') && (
            <Link to="/admin" className="flex items-center space-x-1 text-purple-400 hover:text-purple-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          )}
        </div>

        {/* Mode Switcher & User Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2">
              
              {/* Mode Switcher Button (Driver <-> Captain) */}
              {!isCaptainRoute ? (
                <button
                  onClick={() => navigate('/captain')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md flex items-center space-x-1.5"
                  title="Switch to Captain (Host) Mode"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Switch to Captain</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/search')}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center space-x-1.5"
                  title="Switch to Driver Mode"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Switch to Driver</span>
                </button>
              )}

              {/* Logout */}
              <button
                onClick={() => { logout(); navigate('/welcome'); }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/driver/auth"
                className="px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white transition-colors"
              >
                Driver Sign In
              </Link>
              <Link
                to="/captain/auth"
                className="px-3.5 py-1.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-all"
              >
                Captain Sign In
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
};
