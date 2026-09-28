import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Car, DollarSign, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { AdminStats, ParkingListing } from '../types';
import { api } from '../services/api';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingListings, setPendingListings] = useState<ParkingListing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      const [statsData, pendingData] = await Promise.all([
        api.getAdminStats(),
        api.getPendingListings(),
      ]);
      setStats(statsData);
      setPendingListings(pendingData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.approveListing(id, 'ACTIVE');
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.approveListing(id, 'REJECTED', 'Listing failed safety criteria');
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center justify-between shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Platform Administration & Moderation</span>
          </div>
          <h1 className="text-3xl font-extrabold mt-1">Admin Control Panel</h1>
          <p className="text-purple-200 text-xs mt-1">Platform overview, listing approvals, and commission analytics.</p>
        </div>
      </div>

      {/* STATS METRICS GRID */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">Total Registered Users</span>
            <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">Active Hosts</span>
            <p className="text-2xl font-bold text-slate-900">{stats.total_hosts}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">Total Gross Revenue</span>
            <p className="text-2xl font-bold text-emerald-700">₹{stats.total_revenue.toFixed(2)}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">Platform Commissions</span>
            <p className="text-2xl font-bold text-purple-700">₹{stats.platform_commission_earned.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* PENDING APPROVAL MODERATION QUEUE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span>Pending Listing Approvals Queue ({pendingListings.length})</span>
        </h2>

        {pendingListings.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pendingListings.map((l) => (
              <div key={l.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md uppercase">
                      {l.parking_type}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">ID: {l.id}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{l.title}</h3>
                  <p className="text-xs text-slate-500">{l.exact_address || l.approximate_address}</p>
                  <p className="text-xs text-emerald-700 font-bold">₹{l.pricing_rule?.hourly_price}/hr</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleApprove(l.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => handleReject(l.id)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center space-x-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No pending listing approvals in queue. All active listings are moderated!
          </div>
        )}
      </div>

    </div>
  );
};
