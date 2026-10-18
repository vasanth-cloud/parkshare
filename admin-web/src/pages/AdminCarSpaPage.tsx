import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getFullImageUrl } from '../services/api';
import { CarSpaCenter } from '../types';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Droplets,
  Star,
  PlusCircle,
  Phone,
  MapPin,
  Building,
  RotateCcw,
  X,
  AlertTriangle,
  Award,
  Layers,
  ArrowLeft,
  ShieldAlert
} from 'lucide-react';

export const AdminCarSpaPage: React.FC = () => {
  const [spas, setSpas] = useState<CarSpaCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED'>('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New Car Spa Registration Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newCenterName, setNewCenterName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('Bengaluru');
  const [newAddress, setNewAddress] = useState('');
  const [newServiceType, setNewServiceType] = useState<'DOORSTEP_MOBILE' | 'WORKSHOP_BAY' | 'BOTH'>('BOTH');
  const [newBayCapacity, setNewBayCapacity] = useState('3');
  const [newOperatingHours, setNewOperatingHours] = useState('08:00 AM - 08:00 PM');
  const [newServicesOffered, setNewServicesOffered] = useState<string[]>([
    'Eco Waterless Wash',
    'Signature Snow Foam',
    'Interior Steam Sanitization',
  ]);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);

  const fetchSpas = async () => {
    setLoading(true);
    try {
      const data = await api.getCarSpas(statusFilter === 'ALL' ? undefined : statusFilter);
      setSpas(data);
    } catch (err) {
      console.error('Failed to load car spas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpas();
  }, [statusFilter]);

  const handleUpdateStatus = async (spaId: string, newStatus: string, reason?: string) => {
    setActionLoadingId(spaId);
    try {
      await api.updateCarSpaStatus(spaId, newStatus, reason);
      await fetchSpas();
    } catch (err: any) {
      alert(err.message || 'Failed to update car spa status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRegisterSpa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCenterName.trim() || !newOwnerName.trim() || !newPhone.trim() || !newAddress.trim()) {
      alert('Please fill in required car spa center details');
      return;
    }
    setSubmittingRegistration(true);
    try {
      await api.registerCarSpa({
        centerName: newCenterName.trim(),
        ownerName: newOwnerName.trim(),
        phone: newPhone.trim(),
        city: newCity.trim(),
        address: newAddress.trim(),
        serviceType: newServiceType,
        bayCapacity: parseInt(newBayCapacity) || 2,
        operatingHours: newOperatingHours,
        servicesOffered: newServicesOffered,
      });
      setIsRegisterModalOpen(false);
      setNewCenterName('');
      setNewOwnerName('');
      setNewPhone('');
      setNewAddress('');
      await fetchSpas();
    } catch (err: any) {
      alert(err.message || 'Failed to register car spa');
    } finally {
      setSubmittingRegistration(false);
    }
  };

  // Filtered view
  const filteredSpas = spas.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.centerName.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q);

    const matchesType =
      serviceTypeFilter === 'ALL' || s.serviceType === serviceTypeFilter;

    return matchesSearch && matchesType;
  });

  const totalActive = spas.filter((s) => s.status === 'ACTIVE').length;
  const totalPending = spas.filter((s) => s.status === 'PENDING_APPROVAL').length;
  const totalSuspended = spas.filter((s) => s.status === 'SUSPENDED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Back to Services Navigation */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Services</span>
        </Link>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Car Spa & Detailing Hubs Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supervise mobile detailing units, verify workshop bays, and curate auto wash packages
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            to="/disputes?service=car-spa"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition text-xs font-bold flex items-center space-x-1.5 shadow-xs"
            title="Car Spa Disputes"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Spa Disputes</span>
          </Link>

          <button
            onClick={() => fetchSpas()}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition text-xs font-bold flex items-center space-x-1"
            title="Refresh Directory"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Register Car Spa Partner</span>
          </button>
        </div>
      </div>

      {/* Metric Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Spa Centers</span>
          <div className="text-2xl font-black text-white">{spas.length}</div>
          <span className="text-[10px] text-slate-500 font-medium">Workshops & mobile vans</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active & Bookable</span>
          <div className="text-2xl font-black text-cyan-400">{totalActive}</div>
          <span className="text-[10px] text-cyan-500 font-medium">Ready for consumer slots</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Under Audit</span>
          <div className="text-2xl font-black text-amber-400">{totalPending}</div>
          <span className="text-[10px] text-amber-500 font-medium">Awaiting gear verification</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Suspended</span>
          <div className="text-2xl font-black text-rose-400">{totalSuspended}</div>
          <span className="text-[10px] text-slate-500 font-medium">Temporarily deactivated</span>
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
                  ? 'bg-cyan-600 text-white font-extrabold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s === 'ALL' && 'All Centers'}
              {s === 'ACTIVE' && `Active (${totalActive})`}
              {s === 'PENDING_APPROVAL' && `Pending (${totalPending})`}
              {s === 'SUSPENDED' && `Suspended (${totalSuspended})`}
            </button>
          ))}
        </div>

        {/* Service Model & Text Search */}
        <div className="flex items-center space-x-2 flex-1 md:max-w-md">
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="ALL">All Service Models</option>
            <option value="DOORSTEP_MOBILE">Doorstep Mobile Unit</option>
            <option value="WORKSHOP_BAY">Workshop In-Bay</option>
            <option value="BOTH">Hybrid (Both)</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search center, owner, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Spa Centers List Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs font-semibold">
          Loading car spa partners directory...
        </div>
      ) : filteredSpas.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl p-10 text-center border border-slate-800 space-y-3">
          <h3 className="text-base font-bold text-white">No Car Spa Partners Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No centers match "${searchQuery}". Try modifying your filter.`
              : 'No spa partners registered under this category yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpas.map((spa) => {
            const isActive = spa.status === 'ACTIVE';
            const isPending = spa.status === 'PENDING_APPROVAL';
            const isSuspended = spa.status === 'SUSPENDED';

            const serviceModelLabel =
              spa.serviceType === 'DOORSTEP_MOBILE'
                ?'Doorstep Mobile Van'
                : spa.serviceType === 'WORKSHOP_BAY'
                ?'Workshop In-Bay'
                :'Hybrid (Doorstep + Bay)';

            return (
              <div
                key={spa.id}
                className="bg-slate-900 rounded-3xl border border-slate-800 hover:border-cyan-500/50 transition-all overflow-hidden p-5 space-y-4 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Photo & Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={getFullImageUrl(spa.photo) || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=400&q=80'}
                        alt={spa.centerName}
                        className="w-14 h-14 rounded-2xl object-cover border border-cyan-500/30 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-white truncate" title={spa.centerName}>
                          {spa.centerName}
                        </h3>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          Owner: <strong className="text-slate-200">{spa.ownerName}</strong>
                        </p>
                        <span className="text-[10px] font-bold text-cyan-400 block mt-0.5">
                          {serviceModelLabel}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isActive && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
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

                  {/* Location & Contact Info */}
                  <div className="bg-slate-950/70 p-3 rounded-2xl space-y-1.5 text-xs border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Phone:</span>
                      </span>
                      <span className="font-mono font-bold text-slate-200">{spa.phone}</span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 flex items-center space-x-1.5 flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>Address:</span>
                      </span>
                      <span className="font-medium text-slate-300 text-right truncate max-w-[180px]" title={spa.address}>
                        {spa.address}, {spa.city}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Hours:</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-300">{spa.operatingHours}</span>
                    </div>
                  </div>

                  {/* Operational Capabilities */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Bay / Slot Capacity:</span>
                      <span className="font-bold text-cyan-400">{spa.bayCapacity} Cars Simultaneously</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Rating & Volume:</span>
                      <span className="font-bold text-amber-400 flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{spa.rating}</span>
                        <span className="text-slate-500">({spa.totalOrders} washes done)</span>
                      </span>
                    </div>

                    <div className="pt-1.5 flex flex-wrap gap-1">
                      {spa.servicesOffered.map((svc) => (
                        <span
                          key={svc}
                          className="bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                        >
                          {svc}
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
                      disabled={actionLoadingId === spa.id}
                      onClick={() => handleUpdateStatus(spa.id, 'ACTIVE')}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === spa.id ? 'Updating...' : 'Approve & Activate'}</span>
                    </button>
                  )}

                  {isActive && (
                    <button
                      type="button"
                      disabled={actionLoadingId === spa.id}
                      onClick={() => handleUpdateStatus(spa.id, 'SUSPENDED', 'Temporarily paused by admin')}
                      className="flex-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800 text-slate-300 font-bold py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1 border border-slate-700 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === spa.id ? 'Updating...' : 'Suspend Center'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Car Spa Center Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white">Register Car Spa Partner Hub</h3>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSpa} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Workshop / Detailing Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EcoGlow Auto Spa"
                  value={newCenterName}
                  onChange={(e) => setNewCenterName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Owner / Partner Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Sharma"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98450 77112"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Service Address / Station Area *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 12th Main Road, HAL 2nd Stage, Indiranagar"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Service Delivery Model
                  </label>
                  <select
                    value={newServiceType}
                    onChange={(e) => setNewServiceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                  >
                    <option value="DOORSTEP_MOBILE">Doorstep Mobile Unit (Van)</option>
                    <option value="WORKSHOP_BAY">Workshop In-Bay</option>
                    <option value="BOTH">Hybrid (Both)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Bay / Mobile Van Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newBayCapacity}
                    onChange={(e) => setNewBayCapacity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                  />
                </div>
              </div>

              {/* Services Offered Toggles */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Service Packages Provided
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Eco Waterless Wash',
                    'Signature Snow Foam',
                    'Interior Steam Sanitization',
                    '3M Ceramic Polish',
                    'Clay Bar Detailing',
                  ].map((pkg) => {
                    const checked = newServicesOffered.includes(pkg);
                    return (
                      <button
                        key={pkg}
                        type="button"
                        onClick={() => {
                          if (checked) {
                            setNewServicesOffered(newServicesOffered.filter((x) => x !== pkg));
                          } else {
                            setNewServicesOffered([...newServicesOffered, pkg]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                          checked
                            ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {checked ? '✓ ' : '+ '} {pkg}
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
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
                >
                  {submittingRegistration ? 'Registering...' : 'Register Spa Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
