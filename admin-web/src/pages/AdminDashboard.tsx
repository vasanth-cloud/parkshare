import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { AdminStats } from '../types';
import { LayoutDashboard, Users, Building, Calendar, DollarSign, CheckSquare, ShieldCheck, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Back to Services Navigation */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Services</span>
        </Link>
      </div>

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
            <LayoutDashboard className="w-7 h-7 text-emerald-500" />
            <span>Platform Operations Overview</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time marketplace system statistics & financial performance</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/approvals"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Spaces ({stats?.pending_listings || 0})</span>
          </Link>

          <Link
            to="/drivers"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <span>🧑‍✈️ Drivers ({stats?.total_drivers || 0})</span>
          </Link>

          <Link
            to="/car-spas"
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <span>✨ Car Spas ({stats?.total_car_spas || 0})</span>
          </Link>

          <Link
            to="/users"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 border border-slate-700"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Users</span>
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
          {/* Multi-Service Operations Ecosystem Hub */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>ParkShare Multi-Service Operations</span>
                </h2>
                <p className="text-xs text-slate-400">Direct operational management across parking, chauffeurs, and car wash</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                3 Platforms Live
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Service 1: Parking Radar */}
              <div className="bg-slate-900/90 rounded-3xl p-5 border border-emerald-900/50 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-2xl bg-emerald-950 flex items-center justify-center text-xl border border-emerald-800">
                      🅿️
                    </span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                      {stats.total_listings} Spaces
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">Parking Radar</h3>
                  <p className="text-xs text-slate-400">
                    Host driveway & garage listings, physical GPS spot verification, PIN check-in custody.
                  </p>
                </div>
                <Link
                  to="/approvals"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition text-center block shadow-sm"
                >
                  Moderate Parking Spaces →
                </Link>
              </div>

              {/* Service 2: Acting Drivers */}
              <div className="bg-slate-900/90 rounded-3xl p-5 border border-indigo-900/50 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-2xl bg-indigo-950 flex items-center justify-center text-xl border border-indigo-800">
                      🧑‍✈️
                    </span>
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800">
                      {stats.total_drivers || 3} Registered
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">Acting Drivers Fleet</h3>
                  <p className="text-xs text-slate-400">
                    Certified chauffeur applications, driver verification, transmission credentials, and trip status.
                  </p>
                </div>
                <Link
                  to="/drivers"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition text-center block shadow-sm"
                >
                  Manage Acting Drivers →
                </Link>
              </div>

              {/* Service 3: Car Spa Detailing */}
              <div className="bg-slate-900/90 rounded-3xl p-5 border border-cyan-900/50 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-2xl bg-cyan-950 flex items-center justify-center text-xl border border-cyan-800">
                      ✨
                    </span>
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800">
                      {stats.total_car_spas || 3} Centers
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">Car Spa & Detailing Hubs</h3>
                  <p className="text-xs text-slate-400">
                    Doorstep mobile detailing vans & in-bay workshops, packages, slot capacity, and service approvals.
                  </p>
                </div>
                <Link
                  to="/car-spas"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2.5 rounded-xl transition text-center block shadow-sm"
                >
                  Manage Car Spas →
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
