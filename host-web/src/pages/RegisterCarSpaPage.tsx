import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Droplets,
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
  Wrench
} from 'lucide-react';

export const RegisterCarSpaPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Registration Form State
  const [centerName, setCenterName] = useState('');
  const [ownerName, setOwnerName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [city, setCity] = useState(user?.city || 'Bengaluru');
  const [address, setAddress] = useState(user?.address || '');
  const [serviceType, setServiceType] = useState<'DOORSTEP_MOBILE' | 'WORKSHOP_BAY' | 'BOTH'>('BOTH');
  const [bayCapacity, setBayCapacity] = useState('3');
  const [operatingHours, setOperatingHours] = useState('08:00 AM - 08:00 PM');
  const [servicesOffered, setServicesOffered] = useState<string[]>([
    'Eco Waterless Wash',
    'Signature Snow Foam',
    'Interior Steam Sanitization',
    '3M Ceramic Polish',
  ]);
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=500&q=80'
  );

  const [submitting, setSubmitting] = useState(false);
  const [registeredSpa, setRegisteredSpa] = useState<any | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerName.trim() || !ownerName.trim() || !phone.trim() || !address.trim()) {
      alert('Please fill in required fields: Workshop Name, Owner Name, Phone, and Address');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.registerCarSpa({
        centerName: centerName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
        serviceType,
        bayCapacity: parseInt(bayCapacity) || 2,
        operatingHours,
        servicesOffered,
        photo: photoUrl,
      });

      setRegisteredSpa(result);
    } catch (err: any) {
      alert(err.message || 'Failed to submit car spa registration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      
      {/* Header Bar */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-cyan-600 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Back</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-black bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="text-sm">✨</span>
              <span>Car Spa & Detailing Partner Hub</span>
            </span>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-cyan-950 via-slate-900 to-cyan-900 text-white py-10 px-4 border-b border-cyan-900 shadow-md">
        <div className="max-w-3xl mx-auto space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 px-3 py-1 rounded-full text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto Wash & Detailing Network Onboarding</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Register Your <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-300 bg-clip-text text-transparent">
              Car Spa & Detailing Hub
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-cyan-100 max-w-2xl">
            Get instant booking appointments from ParkShare vehicle owners. Whether you operate a mobile detailing van or a physical workshop station, accept doorstep and in-bay wash orders effortlessly.
          </p>

          {/* Key Partner Benefits */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 max-w-2xl">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-white">0 Setup Fee</span>
              <span className="text-[10px] text-slate-300 font-medium">Free registration</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-cyan-300">Parked Cars</span>
              <span className="text-[10px] text-slate-300 font-medium">Clean while parked</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-amber-400">Pre-Booked</span>
              <span className="text-[10px] text-slate-300 font-medium">Guaranteed time slots</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-emerald-400">Direct Payouts</span>
              <span className="text-[10px] text-slate-300 font-medium">Automated settlement</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form or Success Container */}
      <div className="max-w-3xl mx-auto px-4 mt-8">
        {registeredSpa ? (
          /* ================= SUCCESS REGISTRATION VIEW ================= */
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-emerald-300 dark:border-emerald-800 shadow-xl text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 rounded-3xl flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-wider">
                Registration Successful
              </span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                Welcome to the Car Spa Network!
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                Your detailing center has been officially enrolled and verified on the ParkShare partner ecosystem.
              </p>
            </div>

            {/* Spa Partner Digital Card */}
            <div className="max-w-md mx-auto bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 text-white rounded-3xl p-5 border border-cyan-700/60 shadow-xl text-left space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">✨</span>
                  <div>
                    <h4 className="text-xs font-black text-white">ParkShare Auto Spa Hub</h4>
                    <span className="font-mono text-[10px] text-cyan-300 font-bold">
                      HUB: #{registeredSpa.id}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-400 text-slate-950">
                  Verified Active
                </span>
              </div>

              <div className="flex items-center space-x-3.5">
                <img
                  src={registeredSpa.photo}
                  alt={registeredSpa.centerName}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-400 shadow-sm"
                />
                <div>
                  <h3 className="text-base font-black text-white">{registeredSpa.centerName}</h3>
                  <p className="text-xs text-cyan-200 mt-0.5">Owner: {registeredSpa.ownerName}</p>
                  <p className="text-[11px] text-cyan-300 font-bold mt-0.5 font-mono">
                    {registeredSpa.phone} • {registeredSpa.city}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-cyan-800/60">
                <div>
                  <span className="text-[10px] text-cyan-300 block">Service Delivery</span>
                  <span className="font-bold text-white">
                    {registeredSpa.serviceType === 'DOORSTEP_MOBILE' ? '🚐 Mobile Van' : '🏢 In-Bay Workshop'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-cyan-300 block">Slot Capacity</span>
                  <span className="font-bold text-white">
                    {registeredSpa.bayCapacity} Cars Simultaneously
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/dashboard"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-xs transition shadow-sm"
              >
                Go to Host Dashboard
              </Link>
              <button
                type="button"
                onClick={() => setRegisteredSpa(null)}
                className="w-full sm:w-auto bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold px-6 py-3 rounded-2xl text-xs transition"
              >
                Register Another Hub
              </button>
            </div>
          </div>
        ) : (
          /* ================= SPA REGISTRATION FORM ================= */
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Car Spa & Detailing Hub Registration
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Register your auto wash facility or mobile unit to receive doorstep and in-bay customer orders.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              {/* Center & Owner Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  1. Business & Contact Information
                </h3>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                    Workshop / Detailing Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EcoGlow Doorstep Detailing"
                    value={centerName}
                    onChange={(e) => setCenterName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Owner / Partner Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kiran Kumar"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Contact Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98450 77112"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Station Address / Base Area *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12th Main Road, HAL 2nd Stage, Indiranagar"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Bengaluru"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Service Model & Capacity */}
              <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  2. Operations & Service Setup
                </h3>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                    Service Delivery Model
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'DOORSTEP_MOBILE', title: '🚐 Doorstep Mobile Unit', desc: 'Wash cars at client premises or parking lot' },
                      { id: 'WORKSHOP_BAY', title: '🏢 Workshop In-Bay', desc: 'Customer parks inside your detailing bay' },
                      { id: 'BOTH', title: '⚡ Hybrid (Both)', desc: 'Mobile vans + physical workshop bay' },
                    ].map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setServiceType(model.id as any)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                          serviceType === model.id
                            ? 'border-cyan-600 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                            : 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-black">{model.title}</div>
                        <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{model.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Bay / Mobile Van Capacity (Cars per Slot)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={bayCapacity}
                      onChange={(e) => setBayCapacity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Daily Operating Hours
                    </label>
                    <input
                      type="text"
                      placeholder="08:00 AM - 08:00 PM"
                      value={operatingHours}
                      onChange={(e) => setOperatingHours(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* Packages Provided */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                    Service Packages You Provide
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Eco Waterless Wash',
                      'Signature Snow Foam',
                      'Interior Steam Sanitization',
                      '3M Ceramic Polish',
                      'Clay Bar Detailing',
                      'Alloy Rim De-grease',
                    ].map((pkg) => {
                      const isSelected = servicesOffered.includes(pkg);
                      return (
                        <button
                          key={pkg}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setServicesOffered(servicesOffered.filter((x) => x !== pkg));
                            } else {
                              setServicesOffered([...servicesOffered, pkg]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {pkg}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white font-black text-xs rounded-2xl shadow-lg shadow-cyan-600/30 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Car Spa Partner Registration</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-2">
                  By registering, you confirm following environmental water conservation & scratch-free buffing guidelines.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>

    </div>
  );
};
