import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Car,
  Bike,
  Zap,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Building,
  DollarSign,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Star,
  Layers,
  KeyRound,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const RegisterRentalVehiclePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Registration Form State
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleType, setVehicleType] = useState<'CAR' | 'BIKE'>('CAR');
  const [category, setCategory] = useState('SUV');
  const [regNumber, setRegNumber] = useState('');
  const [transmission, setTransmission] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');
  const [fuelType, setFuelType] = useState<'PETROL' | 'DIESEL' | 'ELECTRIC'>('PETROL');
  const [seats, setSeats] = useState(5);
  const [mileageOrRange, setMileageOrRange] = useState('18 kmpl');
  const [hourlyRate, setHourlyRate] = useState('149');
  const [dailyRate, setDailyRate] = useState('1999');
  const [securityDeposit, setSecurityDeposit] = useState('0');
  const [ownerName, setOwnerName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [city, setCity] = useState(user?.city || 'Bengaluru');
  const [hubAddress, setHubAddress] = useState(user?.address || '');
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredVehicle, setRegisteredVehicle] = useState<any | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleName.trim() || !regNumber.trim() || !ownerName.trim() || !phone.trim() || !hubAddress.trim()) {
      setErrorMsg('Please fill in all required fields: Vehicle Name, Reg Number, Owner Name, Phone, and Hub Address');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const result = await api.registerRentalVehicle({
        vehicleName: vehicleName.trim(),
        vehicleType,
        category,
        regNumber: regNumber.trim().toUpperCase(),
        transmission,
        fuelType,
        seats: Number(seats),
        mileageOrRange: mileageOrRange.trim(),
        hourlyRate: Number(hourlyRate),
        dailyRate: Number(dailyRate),
        securityDeposit: Number(securityDeposit),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        hubAddress: hubAddress.trim(),
        photoUrl: photoUrl.trim() || undefined,
        features: [
          'Sanitized Handover',
          'Fastag Equipped',
          'Zero Deposit Eligible',
          'Instant Keyless Unlock'
        ]
      });
      setRegisteredVehicle(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register rental vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 select-none">
      
      {/* Header */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3.5 shadow-xs sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/services')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl">🚗</span>
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Rental Fleet Partner Portal
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monetize your idle cars & bikes with verified self-drive rentals
              </p>
            </div>
          </div>

          <Link
            to="/services"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
          >
            <span>Partner Hub</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Hero Earnings Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-6 sm:p-8 text-white shadow-xl glow-amber">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wide border border-white/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>EARN ₹30,000 – ₹75,000 / MONTH PER VEHICLE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              List Your Car or Bike for Self-Drive
            </h2>
            <p className="text-sm text-amber-100 font-medium">
              Join ParkCo’s trusted peer-to-peer fleet network. Verified drivers, instant digital passes, damage protection & automated payouts.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs font-bold text-white/90">
              <span className="flex items-center space-x-1 bg-black/20 px-2.5 py-1 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>100% ID Verified Renters</span>
              </span>
              <span className="flex items-center space-x-1 bg-black/20 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Direct Bank Payouts</span>
              </span>
            </div>
          </div>
        </div>

        {/* Success Confirmation View */}
        {registeredVehicle ? (
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Listing Created & Live
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {registeredVehicle.name} is Ready for Bookings!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Your vehicle has been verified and registered on the ParkCo network. Customers can now discover and book it!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-md mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Fleet ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{registeredVehicle.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Category:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{registeredVehicle.category} ({registeredVehicle.transmission})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Daily Rate:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">₹{registeredVehicle.dailyRate} / 24 hrs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Hub Address:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{registeredVehicle.hubAddress}</span>
              </div>
            </div>

            <div className="flex gap-3 max-w-md mx-auto pt-2">
              <button
                onClick={() => navigate('/services')}
                className="flex-1 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-md cursor-pointer"
              >
                Go to Partner Hub
              </button>
              <button
                onClick={() => {
                  setRegisteredVehicle(null);
                  setVehicleName('');
                  setRegNumber('');
                }}
                className="py-3 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Add Another Vehicle
              </button>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleRegister} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Vehicle Category & Type */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs">1</span>
                <span>Vehicle Classification</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setVehicleType('CAR');
                    setCategory('SUV');
                    setSeats(5);
                    setHourlyRate('149');
                    setDailyRate('1999');
                    setPhotoUrl('https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80');
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    vehicleType === 'CAR'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Car className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-xs font-black block">Car or SUV</span>
                  <span className="text-[10px] text-slate-400">Hatchback, Sedan, SUV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVehicleType('BIKE');
                    setCategory('SCOOTER');
                    setSeats(2);
                    setHourlyRate('59');
                    setDailyRate('699');
                    setPhotoUrl('https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80');
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    vehicleType === 'BIKE'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bike className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-xs font-black block">Bike or EV Scooter</span>
                  <span className="text-[10px] text-slate-400">Cruiser, EV, Commuter</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Vehicle Make & Model *</label>
                  <input
                    type="text"
                    placeholder="e.g. Hyundai Creta, Mahindra Thar, Ather 450X"
                    value={vehicleName}
                    onChange={(e) => setVehicleName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Registration Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. KA 01 AB 1234"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Transmission</label>
                  <select
                    value={transmission}
                    onChange={(e: any) => setTransmission(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="AUTOMATIC">Automatic</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e: any) => setFuelType(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="PETROL">Petrol</option>
                    <option value="DIESEL">Diesel</option>
                    <option value="ELECTRIC">Electric (EV)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Seating</label>
                  <select
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value={2}>2 Seats</option>
                    <option value={4}>4 Seats</option>
                    <option value={5}>5 Seats</option>
                    <option value={7}>7 Seats</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Rental Rates */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs">2</span>
                <span>Rental Rates & Deposit</span>
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Daily 24h Rate (₹)</label>
                  <input
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    placeholder="0 for Zero Deposit"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pickup Location & Contact */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs">3</span>
                <span>Hub Location & Owner Details</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Hub / Garage Pickup Address *</label>
                <input
                  type="text"
                  placeholder="e.g. Indiranagar Metro Station Hub, 100ft Road, Bengaluru"
                  value={hubAddress}
                  onChange={(e) => setHubAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Owner / Fleet Partner Name *</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Contact Phone Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-sm shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering Vehicle with ParkCo Fleet...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" />
                    <span>Submit & List Vehicle for Self-Drive</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
