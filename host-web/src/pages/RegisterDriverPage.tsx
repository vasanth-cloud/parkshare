import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  CheckCircle2,
  Car,
  Clock,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  ArrowLeft,
  ChevronRight,
  Star,
  Award,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const RegisterDriverPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Registration Form State
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [city, setCity] = useState(user?.city || 'Bengaluru');
  const [dlNumber, setDlNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [hourlyRate, setHourlyRate] = useState('149');
  const [transmission, setTransmission] = useState<string[]>(['Manual', 'Automatic']);
  const [languages, setLanguages] = useState<string[]>(['Kannada', 'English', 'Hindi']);
  const [tripTypes, setTripTypes] = useState<string[]>(['City Rides', 'Night Safe Drop', 'Outstation Trips']);
  const [photoUrl, setPhotoUrl] = useState(
    user?.profile_photo_url ||
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
  );

  const [submitting, setSubmitting] = useState(false);
  const [registeredDriver, setRegisteredDriver] = useState<any | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !dlNumber.trim()) {
      alert('Please fill in required fields: Full Name, Phone, and Driving License Number');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.registerDriver({
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        dlNumber: dlNumber.trim().toUpperCase(),
        experienceYears: parseInt(experienceYears) || 3,
        hourlyRate: parseFloat(hourlyRate) || 149.0,
        transmission,
        languages,
        photo: photoUrl,
      });

      setRegisteredDriver(result);
    } catch (err: any) {
      alert(err.message || 'Failed to submit driver registration');
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
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Back</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="text-sm">🧑‍✈️</span>
              <span>Acting Driver Partner Portal</span>
            </span>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white py-10 px-4 border-b border-indigo-900 shadow-md">
        <div className="max-w-3xl mx-auto space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 px-3 py-1 rounded-full text-xs font-black">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Official Driver Partner Onboarding</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Earn On Your Terms as a <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">
              ParkShare Certified Chauffeur
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl">
            Drive premium personal cars for vetted car owners in Bengaluru. Set your own hourly rate, select your preferred transmission vehicles, and receive direct instant payouts.
          </p>

          {/* Key Partner Benefits */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 max-w-2xl">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-white">₹149 - ₹300</span>
              <span className="text-[10px] text-slate-300 font-medium">Earn per hour</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-emerald-400">0% Cut</span>
              <span className="text-[10px] text-slate-300 font-medium">First 30 days free</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-amber-400">Daily UPI</span>
              <span className="text-[10px] text-slate-300 font-medium">Direct bank transfer</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="block text-sm sm:text-base font-black text-cyan-300">OTP Trips</span>
              <span className="text-[10px] text-slate-300 font-medium">Safe start & end</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form or Success Container */}
      <div className="max-w-3xl mx-auto px-4 mt-8">
        {registeredDriver ? (
          /* ================= SUCCESS REGISTRATION VIEW ================= */
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-emerald-300 dark:border-emerald-800 shadow-xl text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Registration Successful
              </span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                Welcome to the Chauffeur Network!
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                Your driver partner profile has been registered and verified on the ParkShare ecosystem.
              </p>
            </div>

            {/* Chauffeur Digital Badge Card */}
            <div className="max-w-md mx-auto bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-5 border border-indigo-700/60 shadow-xl text-left space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🧑‍✈️</span>
                  <div>
                    <h4 className="text-xs font-black text-white">ParkShare Driver Partner ID</h4>
                    <span className="font-mono text-[10px] text-indigo-300 font-bold">
                      REF: #{registeredDriver.id}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                  Verified Active
                </span>
              </div>

              <div className="flex items-center space-x-3.5">
                <img
                  src={registeredDriver.photo}
                  alt={registeredDriver.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-400 shadow-sm"
                />
                <div>
                  <h3 className="text-base font-black text-white">{registeredDriver.name}</h3>
                  <p className="text-xs text-indigo-200 mt-0.5 font-mono">{registeredDriver.phone}</p>
                  <p className="text-[11px] text-indigo-300 font-bold mt-0.5">
                    DL: {registeredDriver.dlNumber} • {registeredDriver.city}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-indigo-800/60">
                <div>
                  <span className="text-[10px] text-indigo-300 block">Rate & Experience</span>
                  <span className="font-bold text-white">
                    ₹{registeredDriver.hourlyRate}/hr • {registeredDriver.experienceYears} Yrs Exp
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-300 block">Transmission Proficiencies</span>
                  <span className="font-bold text-white truncate block">
                    {registeredDriver.transmission?.join(', ')}
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
                onClick={() => setRegisteredDriver(null)}
                className="w-full sm:w-auto bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold px-6 py-3 rounded-2xl text-xs transition"
              >
                Register Another Driver
              </button>
            </div>
          </div>
        ) : (
          /* ================= DRIVER REGISTRATION FORM ================= */
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Acting Driver Registration Application
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Please provide your authentic personal and driving credentials for customer trust and quick verification.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  1. Personal & Contact Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Mobile Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98450 12345"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Primary Operating City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bengaluru"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Profile / Avatar Photo URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Driving Credentials */}
              <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  2. Driving Credentials & Experience
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Indian Driving License (DL) Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KA01 20150001234"
                      value={dlNumber}
                      onChange={(e) => setDlNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Years of Driving Experience
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Transmission Types */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                    Transmission Vehicles You Can Confidently Drive
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Manual', 'Automatic', 'EV / Electric', 'Luxury SUV'].map((t) => {
                      const isSelected = transmission.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setTransmission(transmission.filter((x) => x !== t));
                            } else {
                              setTransmission([...transmission, t]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                    Languages Spoken
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Kannada', 'English', 'Hindi', 'Tamil', 'Telugu'].map((l) => {
                      const isSelected = languages.includes(l);
                      return (
                        <button
                          key={l}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setLanguages(languages.filter((x) => x !== l));
                            } else {
                              setLanguages([...languages, l]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Pricing & Trip Preferences */}
              <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  3. Pricing & Trip Types
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Hourly Charge Rate (₹/hr) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">₹</span>
                      <input
                        type="number"
                        min="99"
                        max="800"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">Platform recommendation: ₹149 - ₹199/hr</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                      Willing to Accept Night & Outstation Trips?
                    </label>
                    <div className="flex gap-2 pt-1">
                      {['Night Parties', 'Outstation Full-Day', 'Valet Spot Park'].map((trip) => {
                        const isSelected = tripTypes.includes(trip);
                        return (
                          <button
                            key={trip}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setTripTypes(tripTypes.filter((x) => x !== trip));
                              } else {
                                setTripTypes([...tripTypes, trip]);
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition border cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                                : 'bg-gray-50 dark:bg-slate-800 text-gray-500 border-gray-200 dark:border-slate-700'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '} {trip}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Acting Driver Registration</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-2">
                  By registering, you confirm holding a valid Indian driving license and agree to ParkShare partner terms.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>

    </div>
  );
};
