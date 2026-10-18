import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { AdminStats, ServiceFinancialClassification, ClassifiedTransaction } from '../types';
import {
  LayoutDashboard,
  Users,
  Building,
  Calendar,
  DollarSign,
  CheckSquare,
  ShieldCheck,
  ArrowLeft,
  PieChart,
  TrendingUp,
  ArrowUpRight,
  CreditCard,
  Layers,
  Activity,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Classification Controls
  const [selectedClassification, setSelectedClassification] = useState<'ALL' | 'PARKING' | 'DRIVERS' | 'CAR_SPA'>('ALL');

  const fetchStats = async () => {
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  function round(num: number) {
    return Math.round(num * 100) / 100;
  }

  const resolvedClassifications: ServiceFinancialClassification[] = (() => {
    if (stats?.services_classification && stats.services_classification.length > 0) {
      return stats.services_classification;
    }

    const totalRev = stats?.total_revenue ?? 0;
    const parkingComm = stats?.platform_commission_earned ?? 0;
    const parkingPayout = stats?.total_payouts ?? 0;
    const bookings = stats?.total_bookings ?? 0;

    return [
      {
        service_id: 'PARKING',
        service_name: 'Parking Radar & Spaces',
        short_name: 'Parking Radar',
        category: 'Driveways & Garages',
        icon:'',
        gross_collected: totalRev,
        platform_commission: parkingComm,
        partner_payouts: parkingPayout,
        total_bookings: bookings,
        active_units: stats?.total_listings ?? 0,
        contribution_percentage: totalRev > 0 ? 100 : 0,
        avg_ticket_size: bookings ? round(totalRev / bookings) : 0,
        status: 'ACTIVE'
      },
      {
        service_id: 'DRIVERS',
        service_name: 'Acting Drivers Fleet',
        short_name: 'Acting Drivers',
        category: 'On-Demand Chauffeurs',
        icon:'',
        gross_collected: 0,
        platform_commission: 0,
        partner_payouts: 0,
        total_bookings: 0,
        active_units: stats?.total_drivers ?? 0,
        contribution_percentage: 0,
        avg_ticket_size: 0,
        status: 'ACTIVE'
      },
      {
        service_id: 'CAR_SPA',
        service_name: 'Car Spa & Detailing Hubs',
        short_name: 'Car Spa Detailing',
        category: 'Doorstep & In-Bay Detailing',
        icon: '',
        gross_collected: 0,
        platform_commission: 0,
        partner_payouts: 0,
        total_bookings: 0,
        active_units: stats?.total_car_spas ?? 0,
        contribution_percentage: 0,
        avg_ticket_size: 0,
        status: 'ACTIVE'
      }
    ];
  })();

  const resolvedTransactions: ClassifiedTransaction[] = stats?.classified_transactions ?? [];

  // Calculate live aggregate totals across all services
  const aggregatedGMV = resolvedClassifications.reduce((sum, item) => sum + item.gross_collected, 0);
  const aggregatedCommission = resolvedClassifications.reduce((sum, item) => sum + item.platform_commission, 0);
  const aggregatedPayouts = resolvedClassifications.reduce((sum, item) => sum + item.partner_payouts, 0);
  const aggregatedBookings = resolvedClassifications.reduce((sum, item) => sum + item.total_bookings, 0);

  // Filtered items based on classification selection
  const filteredClassifications = selectedClassification === 'ALL'
    ? resolvedClassifications
    : resolvedClassifications.filter(s => s.service_id === selectedClassification);

  const filteredTransactions = selectedClassification === 'ALL'
    ? resolvedTransactions
    : resolvedTransactions.filter(t => t.service === selectedClassification);

  // Extract each service's classified numbers for quick pills
  const parkingItem = resolvedClassifications.find(s => s.service_id === 'PARKING');
  const driversItem = resolvedClassifications.find(s => s.service_id === 'DRIVERS');
  const spaItem = resolvedClassifications.find(s => s.service_id === 'CAR_SPA');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Back to Services Navigation & Refresh */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition shadow-xs hover:border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Services</span>
        </Link>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-xl transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <LayoutDashboard className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>Platform Operations Overview</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 uppercase tracking-wider">
                  Superadmin Live
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
              </p>
            </div>
          </div>
        </div>

        {/* Live Service Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/approvals"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Spaces ({stats?.pending_listings || 0})</span>
          </Link>

          <Link
            to="/drivers"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <span>Drivers ({stats?.total_drivers ?? 0})</span>
          </Link>

          <Link
            to="/car-spas"
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <span>Car Spas ({stats?.total_car_spas ?? 0})</span>
          </Link>

          <Link
            to="/users"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 border border-slate-700"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Users ({stats?.total_users ?? 0})</span>
          </Link>
        </div>
      </div>

      {loading || !stats ? (
        <div className="text-center py-24 text-slate-500 text-sm flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
          <span>Loading platform & service classification metrics...</span>
        </div>
      ) : (
        <>
          {/* Main KPI Grid: Classified across all services */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Users */}
            <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-2 hover:border-slate-700 transition">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">{stats.total_users}</div>
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                <span>{stats.total_hosts} Registered Hosts & Partners</span>
              </div>
            </div>

            {/* Total Active Units / Capacity */}
            <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-2 hover:border-slate-700 transition">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Ecosystem Units</span>
                <Building className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {(stats.total_listings ?? 0) + (stats.total_drivers ?? 0) + (stats.total_car_spas ?? 0)}
              </div>
              <div className="text-[11px] text-slate-400 flex flex-wrap gap-1">
                <span className="text-emerald-400 font-semibold">{stats.total_listings} Spaces</span> •{' '}
                <span className="text-indigo-400 font-semibold">{stats.total_drivers ?? 0} Drivers</span> •{' '}
                <span className="text-cyan-400 font-semibold">{stats.total_car_spas ?? 0} Spas</span>
              </div>
            </div>

            {/* Total Ecosystem Bookings */}
            <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-2 hover:border-slate-700 transition">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Total Bookings</span>
                <Calendar className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {aggregatedBookings}
              </div>
              <div className="text-[11px] text-slate-400 flex flex-wrap gap-1">
                <span>{parkingItem?.total_bookings || 0}</span>•{''}
                <span>{driversItem?.total_bookings || 0}</span>•{''}
                <span>{spaItem?.total_bookings || 0}</span>
              </div>
            </div>

            {/* Total Gross Collections across All Services */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-5 rounded-3xl border border-emerald-900/60 space-y-2 hover:border-emerald-700/80 transition relative overflow-hidden">
              <div className="flex justify-between items-center text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <span>Gross Collections (All Services)</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                ₹{aggregatedGMV.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Processed via UPI / Razorpay</span>
                <span className="text-emerald-300 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/80">
                  All 3 Verticals
                </span>
              </div>
            </div>
          </div>

          {/* High-Level Financial Classification Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform Commission Earned (10%) across ALL services */}
            <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-4 hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>Platform Commission Earned (10%)</span>
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Gross Profit
                </span>
              </div>
              <div className="text-4xl font-black text-emerald-400 tracking-tight">
                ₹{aggregatedCommission.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct platform revenue from 10% standard commission retained across Parking, Acting Drivers, and Car Spa Detailing transactions.
              </p>
              {/* Classified mini pills */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 font-medium">
                   Parking: ₹{(parkingItem?.platform_commission || 0).toLocaleString()}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 font-medium">
                   Drivers: ₹{(driversItem?.platform_commission || 0).toLocaleString()}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 font-medium">
                  Car Spa: ₹{(spaItem?.platform_commission || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Total Host & Partner Net Payouts (90%) across ALL services */}
            <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-4 hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Total Host & Partner Net Payouts (90%)</span>
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Disbursements
                </span>
              </div>
              <div className="text-4xl font-black text-emerald-400 tracking-tight">
                ₹{aggregatedPayouts.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Net earnings remitted directly to registered space hosts, verified drivers, and car spa centers via automated UPI bank transfers.
              </p>
              {/* Classified mini pills */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 font-medium">
                   Space Hosts: ₹{(parkingItem?.partner_payouts || 0).toLocaleString()}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 font-medium">
                   Chauffeurs: ₹{(driversItem?.partner_payouts || 0).toLocaleString()}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 font-medium">
                  Detailing Bays: ₹{(spaItem?.partner_payouts || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/*  PRIMARY SECTION: ALL SERVICES COLLECTIONS CLASSIFICATION   */}
          {/* ============================================================== */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6">
            {/* Section Header with Mode Toggle & Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <PieChart className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    All Services Collections & Revenue Classification
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Classification Filter Tabs */}
                <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 text-xs">
                  <button
                    onClick={() => setSelectedClassification('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      selectedClassification === 'ALL'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Services
                  </button>
                  <button
                    onClick={() => setSelectedClassification('PARKING')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 ${
                      selectedClassification === 'PARKING'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Parking</span>
                  </button>
                  <button
                    onClick={() => setSelectedClassification('DRIVERS')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 ${
                      selectedClassification === 'DRIVERS'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Drivers</span>
                  </button>
                  <button
                    onClick={() => setSelectedClassification('CAR_SPA')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 ${
                      selectedClassification === 'CAR_SPA'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Car Spa</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Proportional Collections Distribution Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Collections Distribution by Service</span>
                </span>
                <span className="text-slate-400 font-medium">
                  Total Collected: <strong className="text-emerald-400 font-bold">₹{aggregatedGMV.toLocaleString()}</strong>
                </span>
              </div>

              {/* Progress Segment Bar */}
              <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 p-0.5">
                {aggregatedGMV > 0 ? (
                  resolvedClassifications.map((item) => {
                    const pct = aggregatedGMV > 0 ? (item.gross_collected / aggregatedGMV) * 100 : 0;
                    if (pct <= 0) return null;
                    const bgClass =
                      item.service_id === 'PARKING'
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        : item.service_id === 'DRIVERS'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-400'
                        : 'bg-gradient-to-r from-cyan-600 to-cyan-400';

                    return (
                      <div
                        key={item.service_id}
                        style={{ width: `${pct}%` }}
                        className={`${bgClass} h-full first:rounded-l-full last:rounded-r-full transition-all duration-500`}
                        title={`${item.short_name}: ₹${item.gross_collected.toLocaleString()} (${pct.toFixed(1)}%)`}
                      />
                    );
                  })
                ) : (
                  <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center text-[10px] text-slate-400">
                    No transactions recorded yet
                  </div>
                )}
              </div>

              {/* Legend with exact amounts and percentages */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                {resolvedClassifications.map((item) => {
                  const pct = aggregatedGMV > 0 ? ((item.gross_collected / aggregatedGMV) * 100).toFixed(1) : '0.0';
                  const dotColor =
                    item.service_id === 'PARKING'
                      ? 'bg-emerald-400'
                      : item.service_id === 'DRIVERS'
                      ? 'bg-indigo-400'
                      : 'bg-cyan-400';
                  const textHighlight =
                    item.service_id === 'PARKING'
                      ? 'text-emerald-400'
                      : item.service_id === 'DRIVERS'
                      ? 'text-indigo-400'
                      : 'text-cyan-400';

                  return (
                    <div
                      key={item.service_id}
                      className="flex items-center space-x-2 bg-slate-950/70 border border-slate-800/80 px-3 py-1.5 rounded-xl"
                    >
                      <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                      <span className="font-semibold text-slate-300">{item.icon} {item.short_name}:</span>
                      <span className={`font-bold ${textHighlight}`}>
                        ₹{item.gross_collected.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-500">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service Classification Cards (3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {filteredClassifications.map((item) => {
                const isParking = item.service_id === 'PARKING';
                const isDrivers = item.service_id === 'DRIVERS';
                const isSpa = item.service_id === 'CAR_SPA';

                const borderAccent = isParking
                  ? 'border-emerald-900/60 hover:border-emerald-700/80'
                  : isDrivers
                  ? 'border-indigo-900/60 hover:border-indigo-700/80'
                  : 'border-cyan-900/60 hover:border-cyan-700/80';

                const badgeBg = isParking
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                  : isDrivers
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80';

                const textAccent = isParking
                  ? 'text-emerald-400'
                  : isDrivers
                  ? 'text-indigo-400'
                  : 'text-cyan-400';

                const btnBg = isParking
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : isDrivers
                  ? 'bg-indigo-600 hover:bg-indigo-500'
                  : 'bg-cyan-600 hover:bg-cyan-500';

                const targetLink = isParking ? '/approvals' : isDrivers ? '/drivers' : '/car-spas';

                return (
                  <div
                    key={item.service_id}
                    className={`bg-slate-900/90 rounded-3xl p-6 border ${borderAccent} flex flex-col justify-between space-y-5 transition duration-200 shadow-sm`}
                  >
                    <div className="space-y-4">
                      {/* Top Header of Card */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <h3 className="text-base font-bold text-white tracking-tight leading-none">
                              {item.short_name}
                            </h3>
                            <span className="text-[11px] text-slate-400">{item.category}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeBg} uppercase`}>
                          Active Vertical
                        </span>
                      </div>

                      {/* Main Big Metric: Amount Collected */}
                      <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Amount Collected (Gross GMV)
                        </span>
                        <div className={`text-3xl font-black ${textAccent} tracking-tight`}>
                          ₹{item.gross_collected.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                          <span>Contribution to Platform</span>
                          <span className="font-bold text-slate-300">{item.contribution_percentage.toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Financial Classification Split: 10% Platform vs 90% Partner */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                            Platform 10%
                          </span>
                          <span className="text-base font-extrabold text-emerald-400">
                            ₹{item.platform_commission.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Commission</span>
                        </div>

                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                            Partner 90%
                          </span>
                          <span className="text-base font-extrabold text-slate-200">
                            ₹{item.partner_payouts.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Net Payout</span>
                        </div>
                      </div>

                      {/* Performance & Volume Breakdown */}
                      <div className="space-y-2 text-xs pt-1 border-t border-slate-800/60">
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Total Transactions / Volume</span>
                          <span className="font-bold text-white">{item.total_bookings} Bookings</span>
                        </div>

                        <div className="flex justify-between items-center text-slate-400">
                          <span>Active Providers / Capacity</span>
                          <span className="font-bold text-white">
                            {item.active_units} {isParking ? 'Spaces' : isDrivers ? 'Chauffeurs' : 'Centers'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-400">
                          <span>Average Ticket Size (AOV)</span>
                          <span className="font-bold text-slate-200">₹{item.avg_ticket_size.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link
                      to={targetLink}
                      className={`w-full ${btnBg} text-white font-bold text-xs py-2.5 rounded-xl transition text-center flex items-center justify-center space-x-1 shadow-sm`}
                    >
                      <span>Manage {item.short_name}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Classification Comparison Matrix Table */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Service Revenue Classification Matrix</span>
                </h3>
                <span className="text-[11px] text-slate-400">All figures calculated in Indian Rupees (INR)</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-bold">Service Classification</th>
                      <th className="py-3 px-3 font-bold">Category</th>
                      <th className="py-3 px-3 font-bold">Active Units</th>
                      <th className="py-3 px-3 font-bold">Completed Vol</th>
                      <th className="py-3 px-3 font-bold">Amount Collected (GMV)</th>
                      <th className="py-3 px-3 font-bold">Commission (10%)</th>
                      <th className="py-3 px-3 font-bold">Partner Payout (90%)</th>
                      <th className="py-3 px-3 font-bold">GMV Share</th>
                      <th className="py-3 px-4 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
                    {resolvedClassifications.map((s) => (
                      <tr key={s.service_id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                          <span className="text-base">{s.icon}</span>
                          <span>{s.service_name}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">{s.category}</td>
                        <td className="py-3 px-3 font-semibold text-slate-300">{s.active_units}</td>
                        <td className="py-3 px-3 font-semibold text-slate-300">{s.total_bookings}</td>
                        <td className="py-3 px-3 font-black text-emerald-400">
                          ₹{s.gross_collected.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-300">
                          ₹{s.platform_commission.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-200">
                          ₹{s.partner_payouts.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-300">
                          {s.contribution_percentage.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                            <span>ACTIVE</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Summary Total Row */}
                    <tr className="bg-slate-950 font-black text-white border-t-2 border-slate-700">
                      <td className="py-3 px-4 text-emerald-400">Combined Platform Total</td>
                      <td className="py-3 px-3 text-slate-400">3 Ecosystem Verticals</td>
                      <td className="py-3 px-3">
                        {resolvedClassifications.reduce((sum, s) => sum + s.active_units, 0)}
                      </td>
                      <td className="py-3 px-3">{aggregatedBookings}</td>
                      <td className="py-3 px-3 text-emerald-400 text-sm">
                        ₹{aggregatedGMV.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-emerald-300 text-sm">
                        ₹{aggregatedCommission.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-200 text-sm">
                        ₹{aggregatedPayouts.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-emerald-400">100.0%</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">100% RECONCILED</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Classified Transactions Ledger */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Recent Cross-Service Collections Ledger</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Showing {filteredTransactions.length} Transactions
                </span>
              </div>

              <div className="space-y-2">
                {filteredTransactions.slice(0, 6).map((txn) => {
                  const isParking = txn.service === 'PARKING';
                  const isDrivers = txn.service === 'DRIVERS';
                  const isSpa = txn.service === 'CAR_SPA';

                  const badgeClass = isParking
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                    : isDrivers
                    ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
                    : 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80';

                  return (
                    <div
                      key={txn.id}
                      className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{txn.service_icon}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white">{txn.customer_name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                              {txn.service_label}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Ref: {txn.booking_reference} • {txn.date} • {txn.payment_method}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-right">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Gross Collected</span>
                          <span className="font-extrabold text-emerald-400 text-sm">
                            ₹{txn.gross_amount.toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Comm (10%)</span>
                          <span className="font-bold text-slate-300">₹{txn.commission.toLocaleString()}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Payout (90%)</span>
                          <span className="font-bold text-slate-400">₹{txn.net_payout.toLocaleString()}</span>
                        </div>

                        <span className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-[10px] flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>PAID</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* Multi-Service Operations Ecosystem Hub Navigation               */}
          {/* ============================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>ParkCo Multi-Service Operations Hub</span>
                </h2>
                <p className="text-xs text-slate-400">Direct operational management across parking, chauffeurs, and car wash</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                3 Platforms Live
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Service 1: Parking Radar */}
              <div className="bg-slate-900/90 rounded-3xl p-5 border border-emerald-900/50 space-y-4 flex flex-col justify-between hover:border-emerald-700/80 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-2xl bg-emerald-950 flex items-center justify-center text-xl border border-emerald-800">
                      
                    </span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800">
                      {stats.total_listings} Spaces ({stats.pending_listings} Pending)
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">Parking Radar</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Host driveway & garage listings, physical GPS spot verification, PIN check-in custody, and automated booking payouts.
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
              <div className="bg-slate-900/90 rounded-3xl p-5 border border-indigo-900/50 space-y-4 flex flex-col justify-between hover:border-indigo-700/80 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-2xl bg-indigo-950 flex items-center justify-center text-xl border border-indigo-800">
                      
                    </span>
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-800">
                      {stats.total_drivers ?? 0} Registered Chauffeurs
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">Acting Drivers Fleet</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Certified chauffeur applications, driver identity verification, transmission credentials, trip custody, and dispatch tracking.
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
              <div className="bg-slate-900/90 rounded-3xl p-5 border border-cyan-900/50 space-y-4 flex flex-col justify-between hover:border-cyan-700/80 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-2xl bg-cyan-950 flex items-center justify-center text-xl border border-cyan-800">
                    </span>
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-800">
                      {stats.total_car_spas ?? 0} Partner Centers
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">Car Spa & Detailing Hubs</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Doorstep mobile detailing vans & in-bay workshops, packages, slot capacity, booking schedules, and partner approvals.
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
