import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { RentalVehicle } from '../types';
import {
  Car,
  Bike,
  Zap,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  MapPin,
  Building,
  RotateCcw,
  X,
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Fuel,
  FileText
} from 'lucide-react';

export const AdminRentalsPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<RentalVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CAR' | 'BIKE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await api.getRentalVehicles(statusFilter === 'ALL' ? undefined : statusFilter);
      setVehicles(data);
    } catch (err) {
      console.error('Failed to load rental fleet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter]);

  const handleUpdateStatus = async (vehicleId: string, newStatus: string, reason?: string) => {
    setActionLoadingId(vehicleId);
    try {
      await api.updateRentalVehicleStatus(vehicleId, newStatus, reason);
      await fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to update vehicle status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (typeFilter !== 'ALL' && v.vehicleType !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = v.name.toLowerCase().includes(q);
      const matchOwner = v.partnerName.toLowerCase().includes(q);
      const matchCity = v.city.toLowerCase().includes(q);
      const matchHub = v.hubAddress.toLowerCase().includes(q);
      const matchCat = v.category.toLowerCase().includes(q);
      if (!matchName && !matchOwner && !matchCity && !matchHub && !matchCat) return false;
    }
    return true;
  });

  const totalCount = vehicles.length;
  const activeCount = vehicles.filter((v) => v.status === 'ACTIVE').length;
  const pendingCount = vehicles.filter((v) => v.status === 'PENDING_APPROVAL').length;
  const carsCount = vehicles.filter((v) => v.vehicleType === 'CAR').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 select-none">
      
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/services"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl">🚗</span>
                <h1 className="text-lg font-black tracking-tight text-white">
                  Self-Drive Fleet & Vehicle Moderation
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-950 text-amber-400 border border-amber-800">
                  Fleet Ops
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audit rental partner listings, verify RC documents, manage daily rates and approve vehicles
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchVehicles}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center space-x-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              Total Fleet
            </span>
            <span className="text-2xl font-black text-white mt-1 block">
              {totalCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Across all partner hubs</span>
          </div>

          <div className="bg-slate-900 border border-emerald-500/20 p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
              Active On-Road
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {activeCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Ready for instant OTP pass</span>
          </div>

          <div className="bg-slate-900 border border-amber-500/20 p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
              Pending Review
            </span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              {pendingCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Awaiting partner verification</span>
          </div>

          <div className="bg-slate-900 border border-indigo-500/20 p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider block">
              Cars vs Bikes
            </span>
            <span className="text-2xl font-black text-indigo-400 mt-1 block">
              {carsCount} / {totalCount - carsCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Car & Bike ratio</span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search make, model, partner, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status filters */}
            {(['ALL', 'ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  statusFilter === st
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st === 'PENDING_APPROVAL' ? 'Pending' : st}
              </button>
            ))}

            {/* Type filters */}
            <div className="border-l border-slate-800 pl-2 flex items-center gap-1.5">
              {(['ALL', 'CAR', 'BIKE'] as const).map((tp) => (
                <button
                  key={tp}
                  onClick={() => setTypeFilter(tp)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    typeFilter === tp
                      ? 'bg-white text-slate-900 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tp === 'ALL' ? 'All Types' : tp === 'CAR' ? 'Cars' : 'Bikes'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicles Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Loading rental fleet...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-2">
            <span className="text-3xl block">🔍</span>
            <h3 className="text-sm font-black text-white">No Vehicles Match Filters</h3>
            <p className="text-xs text-slate-400">Try adjusting your status or vehicle type filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVehicles.map((v) => (
              <div
                key={v.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  {/* Photo & Status */}
                  <div className="relative h-44 w-full bg-slate-800">
                    <img
                      src={v.photo}
                      alt={v.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-black text-amber-300 border border-white/20">
                        {v.badge}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : v.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-950 text-amber-400 border-amber-800'
                            : 'bg-rose-950 text-rose-400 border-rose-800'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-xs font-bold text-white">
                      {v.vehicleType === 'CAR' ? <Car className="w-3.5 h-3.5" /> : <Bike className="w-3.5 h-3.5" />}
                      <span>{v.category}</span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-white">{v.name}</h3>
                        <div className="flex items-center space-x-1 text-xs font-bold text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{v.rating}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{v.hubAddress}</span>
                      </p>
                    </div>

                    {/* Specs Pills */}
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] bg-slate-800/60 p-2 rounded-xl">
                      <div>
                        <span className="text-slate-400 block font-bold">Gearbox</span>
                        <span className="font-bold text-slate-200">{v.transmission}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">Fuel</span>
                        <span className="font-bold text-slate-200">{v.fuelType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">Daily Rate</span>
                        <span className="font-bold text-amber-400">₹{v.dailyRate}</span>
                      </div>
                    </div>

                    {/* Partner Name & Deposit */}
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Partner: <strong className="text-slate-200">{v.partnerName}</strong></span>
                      <span>Deposit: <strong className="text-emerald-400">{v.securityDeposit === 0 ? '₹0' : `₹${v.securityDeposit}`}</strong></span>
                    </div>

                    {/* RC & Compliance Audit Box */}
                    <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold flex items-center space-x-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>RC Plate:</span>
                        </span>
                        <span className="font-mono font-black text-amber-300">
                          {v.rcNumber || 'Not provided'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Ownership:</span>
                        <span className="font-bold text-slate-300">
                          {v.rcOwnershipType === 'COMMERCIAL' ? 'Commercial / Permit' : 'Private (P2P)'}
                        </span>
                      </div>
                      {v.payoutUpiId && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Payout UPI:</span>
                          <span className="font-mono text-slate-300">{v.payoutUpiId}</span>
                        </div>
                      )}
                      {v.rcDocumentUrl && (
                        <div className="pt-1 border-t border-slate-700/50 flex items-center justify-between">
                          <span className="text-slate-400 text-[10px]">RC Book:</span>
                          <a
                            href={v.rcDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:text-amber-300 font-bold text-[10px] flex items-center space-x-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View Document</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 pt-0 border-t border-slate-800/80 flex items-center gap-2">
                  {v.status === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(v.id, 'ACTIVE')}
                        disabled={actionLoadingId === v.id}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(v.id, 'REJECTED', 'Documents did not meet criteria')}
                        disabled={actionLoadingId === v.id}
                        className="py-2 px-3 rounded-xl bg-rose-950 text-rose-300 hover:bg-rose-900 text-xs font-bold flex items-center justify-center space-x-1 transition disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {v.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleUpdateStatus(v.id, 'SUSPENDED', 'Temporarily paused by admin')}
                      disabled={actionLoadingId === v.id}
                      className="w-full py-2 rounded-xl bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-800/60 text-xs font-bold flex items-center justify-center space-x-1 transition disabled:opacity-50"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Suspend Listing</span>
                    </button>
                  )}

                  {v.status === 'SUSPENDED' && (
                    <button
                      onClick={() => handleUpdateStatus(v.id, 'ACTIVE')}
                      disabled={actionLoadingId === v.id}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1 transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Reactivate Vehicle</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminRentalsPage;
