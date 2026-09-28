import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Search, Calendar, User, LogOut, ShieldCheck, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-emerald-800 text-white shadow-md border-b border-emerald-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="ParkShare Logo" className="h-10 w-10 object-contain rounded-lg bg-white p-1" />
              <span className="font-bold text-xl tracking-tight text-white">ParkShare Driver</span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-700 text-emerald-100 border border-emerald-600">
              Customer Portal
            </span>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-6">
            <Link to="/search" className="flex items-center space-x-1 hover:text-emerald-200 transition text-sm font-medium">
              <Search className="w-4 h-4" />
              <span>Find Parking</span>
            </Link>

            {user ? (
              <>
                <Link to="/bookings" className="flex items-center space-x-1 hover:text-emerald-200 transition text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  <span>My Bookings</span>
                </Link>

                <Link to="/vehicles" className="flex items-center space-x-1 hover:text-emerald-200 transition text-sm font-medium">
                  <Car className="w-4 h-4" />
                  <span>My Vehicles</span>
                </Link>

                <div className="flex items-center space-x-3 border-l border-emerald-700 pl-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm text-white">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline text-sm font-medium text-emerald-100">{user.full_name}</span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/auth');
                    }}
                    className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/auth"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition"
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
