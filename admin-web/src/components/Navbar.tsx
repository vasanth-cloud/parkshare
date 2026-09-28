import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, Users, CheckSquare, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="ParkShare Logo" className="h-10 w-10 object-contain rounded-lg bg-white p-1" />
              <span className="font-bold text-xl tracking-tight text-white">ParkShare Console</span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Platform Superadmin
            </span>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-6">
            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center space-x-1 hover:text-emerald-400 transition text-sm font-medium">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Overview</span>
                </Link>

                <Link to="/approvals" className="flex items-center space-x-1 hover:text-emerald-400 transition text-sm font-medium">
                  <CheckSquare className="w-4 h-4" />
                  <span>Space Approvals</span>
                </Link>

                <Link to="/disputes" className="flex items-center space-x-1 hover:text-emerald-400 transition text-sm font-medium">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Disputes & Reports</span>
                </Link>

                <Link to="/users" className="flex items-center space-x-1 hover:text-emerald-400 transition text-sm font-medium">
                  <Users className="w-4 h-4" />
                  <span>Users Directory</span>
                </Link>

                <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-sm text-white">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline text-sm font-medium text-slate-200">{user.full_name}</span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/auth');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
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

