import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Car,
  Bike,
  Zap,
  ShieldCheck,
  Star,
  MapPin,
  Calendar,
  Clock,
  Fuel,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Phone,
  Shield,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  KeyRound,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RentalVehicle, RentalBooking } from '../types';

export const SelfDriveRentalPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [vehicles, setVehicles] = useState<RentalVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CAR' | 'BIKE' | 'EV'>('ALL');
  const [transmissionFilter, setTransmissionFilter] = useState<'ANY' | 'AUTOMATIC' | 'MANUAL'>('ANY');
  const [searchQuery, setSearchQuery] = useState('');
  const [zeroDepositOnly, setZeroDepositOnly] = useState(false);

  // Booking Modal State
  const [selectedVehicle, setSelectedVehicle] = useState<RentalVehicle | null>(null);
  const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [pickupTime, setPickupTime] = useState('10:00 AM');
  const [deliveryType, setDeliveryType] = useState<'HUB_PICKUP' | 'DOORSTEP_DELIVERY'>('HUB_PICKUP');
  const [doorstepAddress, setDoorstepAddress] = useState('');
  const [withInsurance, setWithInsurance] = useState(true);
  const [customerName, setCustomerName] = useState(user?.full_name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone_number || '');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<RentalBooking | null>(null);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await api.getRentalVehicles();
      setVehicles(data);
    } catch {
      // Fallback local mock if backend offline
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtered vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (categoryFilter === 'CAR' && v.vehicleType !== 'CAR') return false;
    if (categoryFilter === 'BIKE' && v.vehicleType !== 'BIKE') return false;
    if (categoryFilter === 'EV' && v.fuelType !== 'ELECTRIC') return false;
    if (transmissionFilter !== 'ANY' && v.transmission !== transmissionFilter) return false;
    if (zeroDepositOnly && v.securityDeposit > 0) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = v.name.toLowerCase().includes(q);
      const matchCat = v.category.toLowerCase().includes(q);
      const matchLoc = v.hubAddress.toLowerCase().includes(q) || v.city.toLowerCase().includes(q);
      const matchFeatures = v.features.some((f) => f.toLowerCase().includes(q));
      if (!matchName && !matchCat && !matchLoc && !matchFeatures) return false;
    }
    return true;
  });

  const handleOpenBooking = (vehicle: RentalVehicle) => {
    setSelectedVehicle(vehicle);
    setConfirmedBooking(null);
    setBookingError('');
    if (user) {
      if (!customerName) setCustomerName(user.full_name || '');
      if (!customerPhone) setCustomerPhone(user.phone_number || '');
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setBookingError('Please enter your full name and contact phone number.');
      return;
    }

    if (deliveryType === 'DOORSTEP_DELIVERY' && !doorstepAddress.trim()) {
      setBookingError('Please provide your complete delivery address for vehicle drop-off.');
      return;
    }

    setSubmittingBooking(true);
    setBookingError('');

    try {
      const booking = await api.bookRentalVehicle({
        vehicleId: selectedVehicle.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        pickupDate,
        returnDate,
        pickupTime,
        deliveryType,
        doorstepAddress: deliveryType === 'DOORSTEP_DELIVERY' ? doorstepAddress.trim() : undefined,
        withInsurance,
        city: selectedVehicle.city,
      });
      setConfirmedBooking(booking);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to complete booking reservation. Please try again.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Price calculation
  const calculateTotal = (vehicle: RentalVehicle) => {
    const baseFare = vehicle.dailyRate;
    const insurance = withInsurance ? 99 : 0;
    const delivery = deliveryType === 'DOORSTEP_DELIVERY' ? 149 : 0;
    const deposit = vehicle.securityDeposit;
    const grandTotal = baseFare + insurance + delivery + deposit;
    return { baseFare, insurance, delivery, deposit, grandTotal };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 select-none">
      
      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/services')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label="Back to Services"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Self-Drive Cars & Bikes
                </h1>
                <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/20">
                  Instant Pass
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Zero security deposit • Sanitized fleet • Doorstep delivery or hub pickup
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/services')}
            className="hidden sm:flex text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline items-center space-x-1"
          >
            <span>All Services</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* Hero Banner Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-6 sm:p-8 text-white shadow-xl glow-amber">
          <div className="relative z-10 max-w-xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wide border border-white/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>FREEDOM TO EXPLORE • 24/7 ROADSIDE ASSISTANCE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Rent Premium Cars & Bikes by the Hour or Day
            </h2>
            <p className="text-sm text-amber-100 font-medium">
              Choose from verified hatchbacks, compact SUVs, luxury off-roaders & smart electric scooters. Unlock digitally with instant OTP!
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs font-bold text-white/90">
              <span className="flex items-center space-x-1 bg-black/20 px-2.5 py-1 rounded-lg">
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Zero Security Deposit</span>
              </span>
              <span className="flex items-center space-x-1 bg-black/20 px-2.5 py-1 rounded-lg">
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Doorstep Drop & Pickup</span>
              </span>
              <span className="flex items-center space-x-1 bg-black/20 px-2.5 py-1 rounded-lg">
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Unlimited Kilometers Option</span>
              </span>
            </div>
          </div>

          {/* Decorative Background Blob */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by vehicle model (e.g. Creta, Thar, Hunter, Ather) or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'ALL'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Vehicles
              </button>
              <button
                onClick={() => setCategoryFilter('CAR')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'CAR'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Cars & SUVs</span>
              </button>
              <button
                onClick={() => setCategoryFilter('BIKE')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'BIKE'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Bikes & Scooters</span>
              </button>
              <button
                onClick={() => setCategoryFilter('EV')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'EV'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Electric (EV)</span>
              </button>
            </div>
          </div>

          {/* Sub Filters: Transmission & Deposit */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-400">Transmission:</span>
              {(['ANY', 'AUTOMATIC', 'MANUAL'] as const).map((trans) => (
                <button
                  key={trans}
                  onClick={() => setTransmissionFilter(trans)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    transmissionFilter === trans
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {trans === 'ANY' ? 'Any' : trans === 'AUTOMATIC' ? 'Automatic' : 'Manual'}
                </button>
              ))}
            </div>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={zeroDepositOnly}
                onChange={(e) => setZeroDepositOnly(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded-md border-slate-300 focus:ring-amber-500"
              />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Zero Security Deposit Only
              </span>
            </label>
          </div>
        </div>

        {/* Vehicles Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-500">Loading verified self-drive fleet...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
              No Vehicles Found Matching Your Criteria
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your transmission or deposit filters to explore available cars, bikes & electric scooters.
            </p>
            <button
              onClick={() => {
                setCategoryFilter('ALL');
                setTransmissionFilter('ANY');
                setSearchQuery('');
                setZeroDepositOnly(false);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 flex flex-col group"
              >
                {/* Photo & Badge */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={vehicle.photo}
                    alt={vehicle.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-black text-amber-300 border border-white/20">
                      {vehicle.badge}
                    </span>
                    {vehicle.securityDeposit === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-black uppercase tracking-wider">
                        ₹0 Deposit
                      </span>
                    )}
                  </div>

                  {/* Rating Pill */}
                  <div className="absolute bottom-3 right-3 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-black text-slate-800 dark:text-slate-200 shadow-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{vehicle.rating}</span>
                    <span className="text-[10px] text-slate-400">({vehicle.trips})</span>
                  </div>

                  {/* Vehicle Type Icon */}
                  <div className="absolute bottom-3 left-3 text-white text-xs font-bold flex items-center space-x-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full">
                    {vehicle.vehicleType === 'CAR' ? <Car className="w-3.5 h-3.5" /> : <Bike className="w-3.5 h-3.5" />}
                    <span>{vehicle.category}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                          {vehicle.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span className="truncate max-w-[200px]">{vehicle.hubAddress}</span>
                        </p>
                      </div>
                      {vehicle.rcNumber && (
                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>RC Verified</span>
                          </span>
                          <span className="text-[9px] font-mono font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                            {vehicle.rcNumber}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Specs Matrix */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-center">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">Gearbox</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 truncate block">
                          {vehicle.transmission}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-center">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">Fuel</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 truncate block">
                          {vehicle.fuelType}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-center">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">Seats</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 truncate block">
                          {vehicle.seats} Seats
                        </span>
                      </div>
                    </div>

                    {/* Feature tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {vehicle.features.slice(0, 3).map((feat, i) => (
                        <span
                          key={i}
                          className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pricing & CTA */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-xl font-black text-slate-900 dark:text-white">
                          ₹{vehicle.dailyRate}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">/ 24 hrs</span>
                      </div>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold block">
                        ₹{vehicle.hourlyRate}/hr hourly rate
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenBooking(vehicle)}
                      className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Book Now</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal / Dialog */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-6">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {confirmedBooking ? 'Reservation Confirmed!' : `Reserve ${selectedVehicle.name}`}
                  </h3>
                  <p className="text-[11px] text-amber-100 font-medium">
                    {confirmedBooking ? 'Present this digital pass at pickup' : 'Instant digital pass & keyless unlock'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Confirmed State View */}
            {confirmedBooking ? (
              <div className="p-6 space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Booking Successful
                  </span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    Ready for Keyless Handover
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Your {selectedVehicle.name} is reserved. Share the handover OTP with the fleet agent or unlock via smart lock.
                  </p>
                </div>

                {/* Digital Pass OTP Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Booking Reference</span>
                      <p className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                        {confirmedBooking.bookingId}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                        Handover OTP
                      </span>
                      <p className="text-2xl font-black font-mono tracking-widest text-amber-600 dark:text-amber-400">
                        {confirmedBooking.otp}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <p className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">
                        {confirmedBooking.deliveryType === 'DOORSTEP_DELIVERY'
                          ? `Doorstep: ${confirmedBooking.doorstepAddress}`
                          : `Hub: ${selectedVehicle.hubAddress}`}
                      </span>
                    </p>
                    <p className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {confirmedBooking.pickupDate} ({confirmedBooking.pickupTime}) to {confirmedBooking.returnDate}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedVehicle(null);
                      navigate('/bookings');
                    }}
                    className="flex-1 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-md cursor-pointer"
                  >
                    View in My Bookings
                  </button>
                  <button
                    onClick={() => setSelectedVehicle(null)}
                    className="py-3 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Booking Form View */
              <form onSubmit={handleConfirmBooking} className="p-6 space-y-4">
                {bookingError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Selected Vehicle Card */}
                <div className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <img
                    src={selectedVehicle.photo}
                    alt={selectedVehicle.name}
                    className="w-16 h-12 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {selectedVehicle.name}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {selectedVehicle.transmission} • {selectedVehicle.fuelType} • {selectedVehicle.category}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      ₹{selectedVehicle.dailyRate}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/ 24 hrs</span>
                  </div>
                </div>

                {/* Dates & Times */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Pickup Date</label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Return Date</label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Handover Mode */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Handover Option</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('HUB_PICKUP')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        deliveryType === 'HUB_PICKUP'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="block font-black text-xs">Hub Pickup</span>
                      <span className="text-[10px] text-slate-400 block">Self pickup (Free)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType('DOORSTEP_DELIVERY')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        deliveryType === 'DOORSTEP_DELIVERY'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="block font-black text-xs">Doorstep Delivery</span>
                      <span className="text-[10px] text-slate-400 block">At your home (+₹149)</span>
                    </button>
                  </div>
                </div>

                {deliveryType === 'DOORSTEP_DELIVERY' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Complete Delivery Address
                    </label>
                    <input
                      type="text"
                      placeholder="House No, Apartment name, Street, Landmark..."
                      value={doorstepAddress}
                      onChange={(e) => setDoorstepAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      required
                    />
                  </div>
                )}

                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Insurance Add-on */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-black block text-slate-800 dark:text-slate-200">
                        Zero Deductible Protection
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Covers 100% accidental scratch & bumper damage
                      </span>
                    </div>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="checkbox"
                      checked={withInsurance}
                      onChange={(e) => setWithInsurance(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded-md"
                    />
                  </label>
                </div>

                {/* Price Breakdown */}
                {(() => {
                  const fare = calculateTotal(selectedVehicle);
                  return (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Base Rental Fare (24 hrs)</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">₹{fare.baseFare}</span>
                      </div>
                      {fare.delivery > 0 && (
                        <div className="flex justify-between">
                          <span>Doorstep Drop-off</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">₹{fare.delivery}</span>
                        </div>
                      )}
                      {fare.insurance > 0 && (
                        <div className="flex justify-between">
                          <span>Comprehensive Insurance</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">₹{fare.insurance}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Refundable Security Deposit</span>
                        <span>{fare.deposit === 0 ? '₹0 (Waived)' : `₹${fare.deposit}`}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white">
                        <span>Total Payable</span>
                        <span className="text-amber-600 dark:text-amber-400">₹{fare.grandTotal}</span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={submittingBooking}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingBooking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Digital Key Pass...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Confirm & Book Instant Pass</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
