import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DriverProfile } from '../types';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Star,
  PlusCircle,
  Car,
  Phone,
  MapPin,
  FileText,
  RotateCcw,
  X,
  AlertTriangle,
  Award,
  ArrowLeft,
  ShieldAlert
} from 'lucide-react';

export const AdminDriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED'>('ALL');
  const [transmissionFilter, setTransmissionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New Driver Registration Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('Bengaluru');
  const [newDlNumber, setNewDlNumber] = useState('');
  const [newExperience, setNewExperience] = useState('5');
  const [newHourlyRate, setNewHourlyRate] = useState('149');
  const [newTransmission, setNewTransmission] = useState<string[]>(['Manual', 'Automatic']);
  const [newLanguages, setNewLanguages] = useState<string[]>(['Kannada', 'English']);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await api.getDrivers(statusFilter === 'ALL' ? undefined : statusFilter);
      setDrivers(data);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [statusFilter]);

  const handleUpdateStatus = async (driverId: string, newStatus: string, reason?: string) => {
    setActionLoadingId(driverId);
    try {
      await api.updateDriverStatus(driverId, newStatus, reason);
      await fetchDrivers();
    } catch (err: any) {
      alert(err.message || 'Failed to update driver status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newDlNumber.trim()) {
      alert('Please fill in required driver details');
      return;
    }
    setSubmittingRegistration(true);
    try {
      await api.registerDriver({
        name: newName.trim(),
        phone: newPhone.trim(),
        city: newCity.trim(),
        dlNumber: newDlNumber.trim(),
        experienceYears: parseInt(newExperience) || 3,
        hourlyRate: parseFloat(newHourlyRate) || 149.0,
        transmission: newTransmission,
        languages: newLanguages,
      });
      setIsRegisterModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewDlNumber('');
      await fetchDrivers();
    } catch (err: any) {
      alert(err.message || 'Failed to register driver');
    } finally {
      setSubmittingRegistration(false);
    }
  };

  // Filtered view
  const filteredDrivers = drivers.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      d.name.toLowerCase().includes(q) ||
      (d.phone || '').toLowerCase().includes(q) ||
      (d.city || '').toLowerCase().includes(q) ||
      (d.dlNumber || '').toLowerCase().includes(q);

    const matchesTransmission =
      transmissionFilter === 'ALL' || d.transmission.includes(transmissionFilter);

    return matchesSearch && matchesTransmission;
  });

  const totalActive = drivers.filter((d) => d.status === 'ACTIVE').length;
  const totalPending = drivers.filter((d) => d.status === 'PENDING_APPROVAL').length;
  const totalSuspended = drivers.filter((d) => d.status === 'SUSPENDED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Back to Services Navigation */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Services</span>
        </Link>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🧑‍✈️</span>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Acting Drivers Operations Console
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Certify chauffeurs, moderate driving license credentials, and manage on-demand partner availability
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            to="/disputes?service=drivers"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition text-xs font-bold flex items-center space-x-1.5 shadow-xs"
            title="Driver Disputes"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Driver Disputes</span>
          </Link>

          <button
            onClick={() => fetchDrivers()}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition text-xs font-bold flex items-center space-x-1"
            title="Refresh Directory"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Register Acting Driver</span>
          </button>
        </div>
      </div>

      {/* Metric Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Registered</span>
          <div className="text-2xl font-black text-white">{drivers.length}</div>
          <span className="text-[10px] text-slate-500 font-medium">Chauffeur fleet</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active & Dispatched</span>
          <div className="text-2xl font-black text-emerald-400">{totalActive}</div>
          <span className="text-[10px] text-emerald-500 font-medium">Ready for on-demand trips</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Review</span>
          <div className="text-2xl font-black text-amber-400">{totalPending}</div>
          <span className="text-[10px] text-amber-500 font-medium">Awaiting background check</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Suspended</span>
          <div className="text-2xl font-black text-rose-400">{totalSuspended}</div>
          <span className="text-[10px] text-slate-500 font-medium">Blocked from bookings</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl text-xs font-bold border border-slate-800 overflow-x-auto">
          {(['ALL', 'ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s === 'ALL' && 'All Drivers'}
              {s === 'ACTIVE' && `Active (${totalActive})`}
              {s === 'PENDING_APPROVAL' && `Pending (${totalPending})`}
              {s === 'SUSPENDED' && `Suspended (${totalSuspended})`}
            </button>
          ))}
        </div>

        {/* Transmission & Text Search */}
        <div className="flex items-center space-x-2 flex-1 md:max-w-md">
          <select
            value={transmissionFilter}
            onChange={(e) => setTransmissionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">Any Transmission</option>
            <option value="Manual">Manual</option>
            <option value="Automatic">Automatic</option>
            <option value="EV">EV / Electric</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search driver name, phone, city, DL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Drivers List Table / Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs font-semibold">
          Loading driver partner fleet...
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl p-10 text-center border border-slate-800 space-y-3">
          <span className="text-4xl block">🧑‍✈️</span>
          <h3 className="text-base font-bold text-white">No Acting Drivers Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No drivers match "${searchQuery}". Try modifying your filter.`
              : 'No drivers registered under this category yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => {
            const isActive = driver.status === 'ACTIVE';
            const isPending = driver.status === 'PENDING_APPROVAL';
            const isSuspended = driver.status === 'SUSPENDED';

            return (
              <div
                key={driver.id}
                className="bg-slate-900 rounded-3xl border border-slate-800 hover:border-indigo-500/50 transition-all p-5 space-y-4 shadow-sm flex flex-col justify-between"
              >
                {/* Driver Top Row */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={driver.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                        alt={driver.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/30 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h3 className="text-sm font-black text-white truncate" title={driver.name}>
                            {driver.name}
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400 block mt-0.5">
                          {driver.badge || 'Certified Chauffeur'}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isActive && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Active</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Under Review</span>
                        </span>
                      )}
                      {isSuspended && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>Suspended</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact & Location Details */}
                  <div className="bg-slate-950/70 p-3 rounded-2xl space-y-1.5 text-xs border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Phone:</span>
                      </span>
                      <span className="font-mono font-bold text-slate-200">{driver.phone || '+91 98450 XXXXX'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>City:</span>
                      </span>
                      <span className="font-bold text-slate-200">{driver.city || 'Bengaluru'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>DL No:</span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-indigo-300">
                        {driver.dlNumber || 'KA01 20180004921'}
                      </span>
                    </div>
                  </div>

                  {/* Skills & Experience Tags */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Experience:</span>
                      <span className="font-bold text-slate-200">{driver.experienceYears} Years</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Rate:</span>
                      <span className="font-black text-emerald-400">₹{driver.hourlyRate}/hr</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Rating & Trips:</span>
                      <span className="font-bold text-amber-400 flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{driver.rating}</span>
                        <span className="text-slate-500">({driver.trips} trips)</span>
                      </span>
                    </div>

                    <div className="pt-1.5 flex flex-wrap gap-1">
                      {driver.transmission.map((t) => (
                        <span
                          key={t}
                          className="bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                        >
                          🚗 {t}
                        </span>
                      ))}
                      {driver.languages.map((l) => (
                        <span
                          key={l}
                          className="bg-slate-800 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-lg"
                        >
                          🗣️ {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  {!isActive && (
                    <button
                      type="button"
                      disabled={actionLoadingId === driver.id}
                      onClick={() => handleUpdateStatus(driver.id, 'ACTIVE')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === driver.id ? 'Updating...' : 'Approve & Activate'}</span>
                    </button>
                  )}

                  {isActive && (
                    <button
                      type="button"
                      disabled={actionLoadingId === driver.id}
                      onClick={() => handleUpdateStatus(driver.id, 'SUSPENDED', 'Temporarily paused by admin')}
                      className="flex-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800 text-slate-300 font-bold py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1 border border-slate-700 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === driver.id ? 'Updating...' : 'Suspend Driver'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Driver Partner Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🧑‍✈️</span>
                <h3 className="text-base font-black text-white">Register Acting Driver Partner</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterDriver} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Driver Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98450 12345"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Operating City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Bengaluru"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Driving License No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="KA01 20180004921"
                    value={newDlNumber}
                    onChange={(e) => setNewDlNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={newExperience}
                    onChange={(e) => setNewExperience(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Hourly Rate (₹/hr)
                </label>
                <input
                  type="number"
                  min="99"
                  max="1000"
                  value={newHourlyRate}
                  onChange={(e) => setNewHourlyRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Transmission Competencies */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Transmission Types Competent In
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Manual', 'Automatic', 'EV', 'Luxury SUV'].map((t) => {
                    const checked = newTransmission.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          if (checked) {
                            setNewTransmission(newTransmission.filter((x) => x !== t));
                          } else {
                            setNewTransmission([...newTransmission, t]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                          checked
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {checked ? '✓ ' : '+ '} {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingRegistration}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
                >
                  {submittingRegistration ? 'Registering...' : 'Register Chauffeur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
