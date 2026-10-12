import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Star,
  Clock,
  Car,
  MapPin,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Phone,
  Shield,
  Award,
  Zap,
  Navigation,
  Sparkles,
  UserCheck,
  AlertCircle
} from 'lucide-react';

interface DriverProfile {
  id: string;
  name: string;
  photo: string;
  rating: number;
  trips: number;
  experienceYears: number;
  transmission: string[];
  languages: string[];
  badge: string;
  eta: string;
  hourlyRate: number;
}

export const ActingDriversPage: React.FC = () => {
  const navigate = useNavigate();

  // Dynamic drivers from backend
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

  // Booking form state
  const [tripType, setTripType] = useState<'CITY' | 'NIGHT' | 'OUTSTATION' | 'VALET'>('CITY');
  const [transmission, setTransmission] = useState<'ANY' | 'MANUAL' | 'AUTOMATIC'>('AUTOMATIC');
  const [pickupLocation, setPickupLocation] = useState('Indiranagar 100ft Road, Bengaluru');
  const [durationHours, setDurationHours] = useState(2);
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('18:00');
  const [contactPhone, setContactPhone] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);

  // Modal / Confirmed state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDrivers = async () => {
      setLoadingDrivers(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('city', 'Bengaluru');
        if (transmission !== 'ANY') {
          queryParams.set('transmission', transmission === 'AUTOMATIC' ? 'Automatic' : 'Manual');
        }
        const res = await fetch(`/api/v1/drivers/available?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setDrivers(Array.isArray(data) ? data : []);
        } else {
          if (isMounted) setDrivers([]);
        }
      } catch (err) {
        if (isMounted) setDrivers([]);
      } finally {
        if (isMounted) setLoadingDrivers(false);
      }
    };
    fetchDrivers();
    return () => {
      isMounted = false;
    };
  }, [transmission]);

  // Pricing calculations
  const baseRates = {
    CITY: 299, // 2 hours included
    NIGHT: 399, // safe night party drop
    OUTSTATION: 1199, // full day
    VALET: 199, // drop & park in ParkShare space
  };

  const calculateTotal = () => {
    const base = baseRates[tripType];
    const extraHours = Math.max(0, durationHours - 2);
    const extraRate = tripType === 'OUTSTATION' ? 150 : 99;
    return base + extraHours * extraRate;
  };

  const handleBookNow = (driver?: DriverProfile) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const assigned = driver || selectedDriver || (drivers.length > 0 ? drivers[0] : null);
      setConfirmedBooking({
        bookingId: `DRV-${Math.floor(100000 + Math.random() * 900000)}`,
        driver: assigned,
        tripType,
        pickupLocation,
        durationHours,
        totalFare: calculateTotal(),
        otp: Math.floor(1000 + Math.random() * 9000),
      });
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      
      {/* Top Header Navigation */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              ParkShare Mobility
            </span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white py-10 px-4">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative max-w-5xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 px-3 py-1 rounded-full text-xs font-extrabold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>100% Police Verified • Professional Chauffeurs</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              On-Demand <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">Acting Drivers</span> For Your Car
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Relax in the passenger seat while certified chauffeurs drive your personal vehicle. Perfect for city errands, late night return from parties, highway trips, or parking coordination.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-2 max-w-md">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
              <span className="block text-base sm:text-lg font-black text-white">10 Mins</span>
              <span className="text-[10px] text-slate-400 font-medium">Avg Pickup</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
              <span className="block text-base sm:text-lg font-black text-amber-400">4.92 ★</span>
              <span className="text-[10px] text-slate-400 font-medium">Rating (8k+ trips)</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
              <span className="block text-base sm:text-lg font-black text-emerald-400">₹0 Surge</span>
              <span className="text-[10px] text-slate-400 font-medium">Flat Rates</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Booking Widget */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">Book an Acting Driver</h2>
                <p className="text-xs text-slate-500">Select your ride type & customize details</p>
              </div>
              <span className="text-xs font-black bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-xl">
                Active in Bengaluru
              </span>
            </div>

            {/* Trip Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">1. Trip Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'CITY', label: 'City Ride', desc: 'From ₹299 (2 hrs)', icon: Car },
                  { id: 'NIGHT', label: 'Night Safe', desc: 'Party drop • ₹399', icon: Zap },
                  { id: 'OUTSTATION', label: 'Outstation', desc: 'Full Day • ₹1,199', icon: Navigation },
                  { id: 'VALET', label: 'Park Assist', desc: 'Drop & Park • ₹199', icon: MapPin },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = tripType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setTripType(type.id as any)}
                      className={`p-3 rounded-2xl border text-left transition active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      <div className="text-xs font-black">{type.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{type.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Car Transmission Preference */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">2. Your Car Transmission</label>
              <div className="flex items-center space-x-2">
                {[
                  { id: 'AUTOMATIC', label: 'Automatic / AMT / DCT' },
                  { id: 'MANUAL', label: 'Manual' },
                  { id: 'ANY', label: 'Either / Any' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTransmission(t.id as any)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      transmission === t.id
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pickup Location & Time Details */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">3. Trip Schedule & Location</label>
              
              <div className="space-y-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5 space-x-2 border border-slate-200 dark:border-slate-700">
                  <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Enter pickup address in Bengaluru"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2 space-x-2 border border-slate-200 dark:border-slate-700">
                    <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2 space-x-2 border border-slate-200 dark:border-slate-700">
                    <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <input
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {tripType !== 'OUTSTATION' && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Expected Duration:</span>
                  <div className="flex items-center space-x-2">
                    {[2, 4, 6, 8].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setDurationHours(hrs)}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                          durationHours === hrs
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {hrs} hrs
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Summary & Action */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Estimated Total</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">₹{calculateTotal()}</span>
                  <span className="text-xs text-slate-500 font-medium">({durationHours} hrs flat)</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Zero advance required • Pay after drive</span>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleBookNow()}
                className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm Driver</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Safety & Trust Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-2.5">
              <Shield className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-black">₹5 Lakh Cover</h4>
                <p className="text-[10px] text-slate-500">Free trip insurance</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-2.5">
              <UserCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-black">Verified IDs</h4>
                <p className="text-[10px] text-slate-500">Aadhaar + DL check</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-2.5 col-span-2 sm:col-span-1">
              <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-black">5+ Yrs Exper.</h4>
                <p className="text-[10px] text-slate-500">Smooth car handling</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Available Verified Drivers */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Available Drivers Around You</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-500">
              {loadingDrivers ? 'Checking...' : `Nearby (${drivers.length})`}
            </span>
          </div>

          {loadingDrivers ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Scanning for verified acting drivers...</p>
            </div>
          ) : drivers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
                <Car className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">No Acting Drivers Registered Yet</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                As drivers register through the ParkShare Partner Portal or Host Dashboard, verified chauffeurs will appear here.
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Realtime Registry Ready
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3 hover:border-indigo-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={driver.photo}
                        alt={driver.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/20"
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white">{driver.name}</h4>
                          <span className="text-[9px] font-extrabold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded">
                            {driver.badge}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="flex items-center text-amber-500 font-bold">
                            <Star className="w-3 h-3 fill-amber-500 mr-0.5" />
                            {driver.rating}
                          </span>
                          <span>• {driver.trips} trips</span>
                          <span>• {driver.experienceYears} yrs exp</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      {driver.eta}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <div className="flex items-center space-x-1 text-slate-500 text-[10px]">
                      <span>Drives:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{driver.transmission.join(', ')}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDriver(driver);
                        handleBookNow(driver);
                      }}
                      className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Request Now</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ParkShare Synergy Card */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-3xl p-4 shadow-md space-y-2">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-200" />
              <h4 className="text-xs font-black">ParkShare Seamless Handover</h4>
            </div>
            <p className="text-[11px] text-emerald-50 leading-relaxed">
              Have your driver drop you off and park your car safely inside any reserved ParkShare spot with digital OTP handover!
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Success Modal */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Driver Dispatched!</h3>
              <p className="text-xs text-slate-500">Booking Ref: {confirmedBooking.bookingId}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 space-y-2.5">
              {confirmedBooking.driver ? (
                <div className="flex items-center space-x-3">
                  <img
                    src={confirmedBooking.driver.photo}
                    alt={confirmedBooking.driver.name}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black truncate">{confirmedBooking.driver.name}</h4>
                    <p className="text-[10px] text-slate-500">{confirmedBooking.driver.eta || 'Arriving in ~8 mins'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block">Trip OTP</span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                      {confirmedBooking.otp}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">Driver Broadcasted</h4>
                    <p className="text-[10px] text-slate-500">Matching nearest verified driver</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block">Trip OTP</span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                      {confirmedBooking.otp}
                    </span>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Estimated Total:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{confirmedBooking.totalFare}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setConfirmedBooking(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmedBooking(null);
                  navigate('/bookings');
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                View Status
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
