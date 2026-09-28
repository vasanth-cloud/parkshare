import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { AdminStats } from '../types';
import { LayoutDashboard, Users, Building, Calendar, DollarSign, CheckSquare, ShieldCheck } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
            <LayoutDashboard className="w-7 h-7 text-emerald-500" />
            <span>Platform Operations Overview</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time marketplace system statistics & financial performance</p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/approvals"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Moderate Spaces ({stats?.pending_listings || 0})</span>
          </Link>

          <Link
            to="/users"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 border border-slate-700"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {loading || !stats ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading platform metrics...</div>
      ) : (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats.total_users}</div>
              <span className="text-[11px] text-slate-500">{stats.total_hosts} Registered Hosts</span>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                <span>Total Spaces</span>
                <Building className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats.total_listings}</div>
              <span className="text-[11px] text-emerald-400 font-semibold">{stats.pending_listings} Pending Approval</span>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                <span>Total Bookings</span>
                <Calendar className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats.total_bookings}</div>
              <span className="text-[11px] text-emerald-400 font-semibold">{stats.active_bookings} Active Sessions</span>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                <span>Gross Revenue (GMV)</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">₹{stats.total_revenue.toLocaleString()}</div>
              <span className="text-[11px] text-slate-500">Processed via Razorpay</span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Platform Commission Earned (10%)</span>
              </h2>
              <div className="text-4xl font-extrabold text-emerald-400">
                ₹{stats.platform_commission_earned.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Platform revenue generated directly from 10% booking commission structure across all completed transactions.
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Total Host Net Payouts</span>
              </h2>
              <div className="text-4xl font-extrabold text-emerald-400">
                ₹{stats.total_payouts.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Net earnings remitted directly to registered space hosts via automated UPI bank transfers.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
