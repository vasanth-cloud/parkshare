import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, LayoutDashboard, KeyRound, DollarSign, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-emerald-950 text-white shadow-md border-b border-emerald-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="ParkShare Logo" className="h-10 w-10 object-contain rounded-lg bg-white p-1" />
              <span className="font-bold text-xl tracking-tight text-white">ParkShare Host</span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-900 text-emerald-200 border border-emerald-800">
              Host & Captain Portal
            </span>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-6">
            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center space-x-1 hover:text-emerald-300 transition text-sm font-medium">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>

                <Link to="/create-listing" className="flex items-center space-x-1 hover:text-emerald-300 transition text-sm font-medium">
                  <PlusCircle className="w-4 h-4" />
                  <span>List Space</span>
                </Link>

                <Link to="/pin-verify" className="flex items-center space-x-1 hover:text-emerald-300 transition text-sm font-medium">
                  <KeyRound className="w-4 h-4" />
                  <span>Check-in PIN</span>
                </Link>

                <Link to="/verification" className="flex items-center space-x-1 hover:text-emerald-300 transition text-sm font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>KYC Verification</span>
                </Link>

                <Link to="/earnings" className="flex items-center space-x-1 hover:text-emerald-300 transition text-sm font-medium">
                  <DollarSign className="w-4 h-4" />
                  <span>Earnings</span>
                </Link>

                <div className="flex items-center space-x-3 border-l border-emerald-900 pl-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-sm text-white">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline text-sm font-medium text-emerald-100">{user.full_name}</span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/auth');
                    }}
                    className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition"
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-sm transition"
                >
                  Host Sign In / Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
