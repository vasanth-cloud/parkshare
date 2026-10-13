import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, Users, CheckSquare, ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide the global navigation bar before choosing services (on home/services page)
  const isServicesHomePage = location.pathname === '/' || location.pathname === '/services';
  if (isServicesHomePage) {
    return null;
  }

  return (
    <nav className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="ParkShare Logo" className="h-9 w-9 object-contain rounded-lg bg-white p-1" />
              <span className="font-bold text-lg tracking-tight text-white">ParkShare Console</span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Platform Superadmin
            </span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-5">
            {user ? (
              <>
                {/* Back to 3 Services Switcher */}
                <Link
                  to="/"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold transition text-xs border border-slate-700 shadow-xs"
                  title="Return to Services Home"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Services</span>
                </Link>

                <Link
                  to="/approvals"
                  className={`flex items-center space-x-1 transition text-xs sm:text-sm font-medium ${
                    location.pathname === '/approvals' ? 'text-emerald-400 font-bold' : 'text-slate-300 hover:text-emerald-400'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Space Approvals</span>
                </Link>

                <Link
                  to="/drivers"
                  className={`flex items-center space-x-1 transition text-xs sm:text-sm font-medium ${
                    location.pathname === '/drivers' ? 'text-indigo-400 font-bold' : 'text-slate-300 hover:text-indigo-400'
                  }`}
                >
                  <span className="text-base leading-none">🧑‍✈️</span>
                  <span>Acting Drivers</span>
                </Link>

                <Link
                  to="/car-spas"
                  className={`flex items-center space-x-1 transition text-xs sm:text-sm font-medium ${
                    location.pathname === '/car-spas' ? 'text-cyan-400 font-bold' : 'text-slate-300 hover:text-cyan-400'
                  }`}
                >
                  <span className="text-base leading-none">✨</span>
                  <span>Car Spas</span>
                </Link>

                <Link
                  to="/dashboard"
                  className={`hidden md:flex items-center space-x-1 transition text-xs sm:text-sm font-medium ${
                    location.pathname === '/dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-300 hover:text-emerald-400'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Overview</span>
                </Link>

                <Link
                  to="/disputes"
                  className={`hidden lg:flex items-center space-x-1 transition text-xs sm:text-sm font-medium ${
                    location.pathname === '/disputes' ? 'text-emerald-400 font-bold' : 'text-slate-300 hover:text-emerald-400'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Disputes</span>
                </Link>

                <Link
                  to="/users"
                  className={`hidden lg:flex items-center space-x-1 transition text-xs sm:text-sm font-medium ${
                    location.pathname === '/users' ? 'text-emerald-400 font-bold' : 'text-slate-300 hover:text-emerald-400'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Users</span>
                </Link>

                <div className="flex items-center space-x-2.5 border-l border-slate-800 pl-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs text-white">
                      {user.full_name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <span className="hidden xl:inline text-xs font-medium text-slate-200">{user.full_name}</span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/auth');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/auth"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-sm transition"
                >
                  Admin Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
