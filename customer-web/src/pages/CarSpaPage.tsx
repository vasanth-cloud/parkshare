import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Droplets,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  Car,
  MapPin,
  Star,
  ArrowLeft,
  ChevronRight,
  Zap,
  Award,
  Layers,
  Check
} from 'lucide-react';

interface SpaPackage {
  id: string;
  name: string;
  tagline: string;
  price: number;
  durationMinutes: number;
  popular?: boolean;
  features: string[];
  recommendedFor: string;
}

const SPA_PACKAGES: SpaPackage[] = [
  {
    id: 'ECO_EXPRESS',
    name: 'Eco Waterless Express',
    tagline: 'Quick 30-min exterior shine',
    price: 199,
    durationMinutes: 30,
    features: [
      'Polymer waterless foam wash',
      'Scratch-free microfiber buffing',
      'Windshield & mirror de-greasing',
      'Tire dress & rim wipe',
    ],
    recommendedFor: 'Daily maintenance & dusty cars',
  },
  {
    id: 'FOAM_PRESSURE',
    name: 'Signature Foam Wash',
    tagline: 'Deep active foam & wheel care',
    price: 399,
    durationMinutes: 45,
    popular: true,
    features: [
      'High-pressure water rinse',
      'pH-neutral snow foam bath',
      'Deep alloy rim & brake dust removal',
      'Door jamb cleaning & wiper blade degrease',
      'Tire conditioning gloss',
    ],
    recommendedFor: 'Weekly wash & highway trips',
  },
  {
    id: 'DEEP_INTERIOR',
    name: 'Deep Interior Spa & Steam',
    tagline: 'Germ-free 99.9% sanitization',
    price: 699,
    durationMinutes: 60,
    features: [
      '360° deep cabin vacuum (trunk included)',
      'AC vent high-temp steam sterilization',
      'Upholstery & carpet dry foam shampoo',
      'Leather conditioning & matte dash polish',
      'Eliminates odors & bacteria',
    ],
    recommendedFor: 'Family cars & smoke/dust odors',
  },
  {
    id: 'CERAMIC_GLAZE',
    name: '3M Ceramic Glaze & Polish',
    tagline: 'Showroom glossy hydrophobic shield',
    price: 1299,
    durationMinutes: 90,
    features: [
      'Full exterior clay bar decontamination',
      'Single-stage machine polish (swirl reduction)',
      '3M Ceramic polymer hydrophobic sealant',
      'Glass rain-repellent coat',
      'Long-lasting 6-month shine protection',
    ],
    recommendedFor: 'Special occasions & high-gloss lovers',
  },
];

export const CarSpaPage: React.FC = () => {
  const navigate = useNavigate();

  // Booking states
  const [selectedPackageId, setSelectedPackageId] = useState<string>('FOAM_PRESSURE');
  const [vehicleCategory, setVehicleCategory] = useState<'HATCHBACK' | 'SEDAN' | 'SUV' | 'BIKE'>('SEDAN');
  const [locationType, setLocationType] = useState<'DOORSTEP' | 'PARKSHARE_BAY'>('DOORSTEP');
  const [address, setAddress] = useState('Indiranagar 100ft Road, Bengaluru');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('11:00 AM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState<any | null>(null);

  const selectedPkg = SPA_PACKAGES.find((p) => p.id === selectedPackageId) || SPA_PACKAGES[1];

  // Price adjustment based on vehicle
  const vehicleSurplus: Record<string, number> = {
    HATCHBACK: 0,
    SEDAN: 50,
    SUV: 100,
    BIKE: -50,
  };

  const finalPrice = Math.max(99, selectedPkg.price + (vehicleSurplus[vehicleCategory] || 0));

  const handleBook = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setBookingConfirmed({
        id: `SPA-${Math.floor(100000 + Math.random() * 900000)}`,
        packageName: selectedPkg.name,
        price: finalPrice,
        date,
        timeSlot,
        address,
        vehicleCategory,
        otp: Math.floor(1000 + Math.random() * 9000),
      });
      setIsSubmitting(false);
    }, 800);
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
            <span className="text-xs font-black bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-500" />
              ParkShare Auto Spa
            </span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-cyan-950 via-slate-900 to-slate-950 text-white py-10 px-4">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative max-w-5xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 px-3 py-1 rounded-full text-xs font-extrabold">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span>Doorstep & In-Bay Professional Detailing • 100% Eco-Safe</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Premium <span className="bg-gradient-to-r from-cyan-400 to-emerald-300 bg-clip-text text-transparent">Car Spa & Detailing</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Get showroom shine while your car is parked at home, office, or inside your reserved ParkShare parking spot. We bring our own high-tech water & power units!
            </p>
          </div>

          {/* Value Badges */}
          <div className="grid grid-cols-3 gap-2 pt-2 max-w-md">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
              <span className="block text-base sm:text-lg font-black text-cyan-300">Zero Water Waste</span>
              <span className="text-[10px] text-slate-400 font-medium">Eco Friendly</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
              <span className="block text-base sm:text-lg font-black text-amber-400">3M™ Products</span>
              <span className="text-[10px] text-slate-400 font-medium">Scratch-Free Buff</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
              <span className="block text-base sm:text-lg font-black text-emerald-400">At Your Bay</span>
              <span className="text-[10px] text-slate-400 font-medium">Clean while parked</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Spa Packages */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              1. Choose Spa Package
            </h2>
            <span className="text-xs text-slate-500 font-bold">4 Packages Available</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SPA_PACKAGES.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`relative rounded-3xl p-4 border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 ring-2 ring-cyan-500/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-cyan-300'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                      ★ Most Popular
                    </span>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white">{pkg.name}</h3>
                        <p className="text-[10px] text-slate-500">{pkg.tagline}</p>
                      </div>
                      <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">₹{pkg.price}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                      <Clock className="w-3 h-3 text-cyan-500" />
                      <span>~{pkg.durationMinutes} mins service time</span>
                    </div>

                    <ul className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-medium">
                    Best for: {pkg.recommendedFor}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vehicle Category & Location Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-xs">
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">2. Vehicle Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'HATCHBACK', label: 'Hatchback', extra: 'Base' },
                  { id: 'SEDAN', label: 'Sedan / CUV', extra: '+₹50' },
                  { id: 'SUV', label: 'Large SUV', extra: '+₹100' },
                  { id: 'BIKE', label: 'Bike / Scooter', extra: '-₹50' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleCategory(v.id as any)}
                    className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                      vehicleCategory === v.id
                        ? 'border-cyan-600 bg-cyan-600 text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-black">{v.label}</div>
                    <div className={`text-[10px] ${vehicleCategory === v.id ? 'text-cyan-100' : 'text-slate-400'}`}>{v.extra}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Service Location Choice */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">3. Service Location</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLocationType('DOORSTEP')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    locationType === 'DOORSTEP'
                      ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-cyan-600 mb-1" />
                  <div className="text-xs font-black">Doorstep Service</div>
                  <div className="text-[10px] text-slate-500">At my home or office address</div>
                </button>

                <button
                  type="button"
                  onClick={() => setLocationType('PARKSHARE_BAY')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    locationType === 'PARKSHARE_BAY'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-600 mb-1" />
                  <div className="text-xs font-black">At Parking Bay</div>
                  <div className="text-[10px] text-slate-500">Wash while parked in ParkShare</div>
                </button>
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5 space-x-2 border border-slate-200 dark:border-slate-700 mt-2">
                <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Service address in Bengaluru..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Date, Slot & Checkout */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Schedule Service Slot</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Select Date</label>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2 space-x-2 border border-slate-200 dark:border-slate-700 mt-1">
                  <Calendar className="w-4 h-4 text-cyan-500" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Preferred Time Slot</label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTimeSlot(slot)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        timeSlot === slot
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>{selectedPkg.name}</span>
                <span>₹{selectedPkg.price}</span>
              </div>
              {vehicleSurplus[vehicleCategory] !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Vehicle adjustment ({vehicleCategory})</span>
                  <span>{vehicleSurplus[vehicleCategory] > 0 ? `+₹${vehicleSurplus[vehicleCategory]}` : `-₹${Math.abs(vehicleSurplus[vehicleCategory])}`}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                <span>Doorstep Travel & Fuel</span>
                <span>FREE (₹0)</span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between items-baseline">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">Total Amount</span>
                <span className="text-xl font-black text-cyan-600 dark:text-cyan-400">₹{finalPrice}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleBook}
              className="w-full bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-black text-xs py-3.5 rounded-2xl shadow-lg shadow-cyan-600/30 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Confirm Spa Appointment</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Guarantee Box */}
          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-3xl p-4 space-y-2.5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2 text-xs font-black text-slate-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>100% Satisfaction Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Not thrilled with the gloss? Our mobile detailer will re-wash on the spot for free or issue an instant platform refund.
            </p>
          </div>
        </div>
      </div>

      {/* Booking Confirmed Modal */}
      {bookingConfirmed && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Car Spa Confirmed!</h3>
              <p className="text-xs text-slate-500">Appointment Ref: {bookingConfirmed.id}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Package:</span>
                <span className="font-bold text-slate-900 dark:text-white">{bookingConfirmed.packageName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slot:</span>
                <span className="font-bold text-slate-900 dark:text-white">{bookingConfirmed.date} • {bookingConfirmed.timeSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total:</span>
                <span className="font-black text-cyan-600 dark:text-cyan-400">₹{bookingConfirmed.price}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center">
                <span className="text-slate-400">Service OTP:</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{bookingConfirmed.otp}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setBookingConfirmed(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setBookingConfirmed(null);
                  navigate('/bookings');
                }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                My Schedule
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
