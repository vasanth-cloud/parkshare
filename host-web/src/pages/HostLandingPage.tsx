import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PlusCircle, DollarSign, ShieldCheck, KeyRound, ArrowRight, Building, Home, Warehouse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const HostLandingPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;


  return (
    <div className="flex flex-col min-h-screen bg-emerald-50/20">
      {/* Hero Header */}
      <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 shadow-xl border-b border-emerald-900">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-emerald-900/80 border border-emerald-700/60 px-4 py-1.5 rounded-full text-sm font-semibold text-emerald-200">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Earn Passive Income From Unused Parking Spaces</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Turn Your Driveway, Garage, or Apartment Spot <br className="hidden sm:inline" />
            <span className="text-emerald-400">Into Daily Passive Income</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-emerald-100/90">
            List your space in 2 minutes. Set your own pricing per hour or day. Get instant payouts directly into your bank or UPI account.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              to="/auth"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-7 py-3 rounded-xl transition shadow-lg flex items-center space-x-2 text-sm"
            >
              <span>🅿️ Register as Parking Host</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/register/driver"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-7 py-3 rounded-xl transition shadow-lg flex items-center space-x-2 text-sm"
            >
              <span>🧑‍✈️ Register as Acting Driver</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/register/car-spa"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-7 py-3 rounded-xl transition shadow-lg flex items-center space-x-2 text-sm"
            >
              <span>✨ Register Car Spa Partner</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Partner Monetization Streams Menu */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
            ParkShare Partner Network
          </span>
          <h2 className="text-3xl font-black text-gray-900 mt-2">Choose How You Want to Partner & Earn</h2>
          <p className="text-gray-600 text-sm mt-1 max-w-xl mx-auto">
            Whether you own parking bays, drive professionally, or run an auto wash workshop, start earning with ParkShare today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Parking Space Host */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-200/80 hover:border-emerald-500 transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl border border-emerald-100">
                🅿️
              </div>
              <h3 className="text-lg font-black text-gray-900">Parking Space Host</h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Rent out vacant house driveways, covered carports, basement bays, or commercial plots to verified drivers.
              </p>
              <ul className="text-xs text-gray-600 space-y-1.5 pt-2 border-t border-gray-100">
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Set your own hourly/monthly price</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Digital PIN check-in & OTP release</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Automated bank & UPI payouts</span>
                </li>
              </ul>
            </div>
            <Link
              to="/auth"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs transition text-center shadow-md block"
            >
              List Your Parking Space →
            </Link>
          </div>

          {/* Card 2: Acting Driver Partner */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-200/80 hover:border-indigo-500 transition-all space-y-4 flex flex-col justify-between ring-2 ring-indigo-500/10">
            <div className="space-y-3">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl border border-indigo-100">
                🧑‍✈️
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">Acting Driver Partner</h3>
                <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  High Demand
                </span>
              </div>
              <p className="text-gray-600 text-xs leading-relaxed">
                Drive customer personal vehicles for city rides, safe party night drops, outstation journeys, and valet park assist.
              </p>
              <ul className="text-xs text-gray-600 space-y-1.5 pt-2 border-t border-gray-100">
                <li className="flex items-center space-x-2">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <span>Earn ₹150 - ₹300 per hour</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <span>Choose your preferred city trips & hours</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <span>Zero commission for your first 30 days</span>
                </li>
              </ul>
            </div>
            <Link
              to="/register/driver"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl text-xs transition text-center shadow-md block"
            >
              Register as Acting Driver →
            </Link>
          </div>

          {/* Card 3: Car Spa Detailing Partner */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-cyan-200/80 hover:border-cyan-500 transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center text-3xl border border-cyan-100">
                ✨
              </div>
              <h3 className="text-lg font-black text-gray-900">Car Spa & Wash Partner</h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Connect your mobile doorstep detailing van or car wash workshop to ParkShare's thousands of parked vehicle owners.
              </p>
              <ul className="text-xs text-gray-600 space-y-1.5 pt-2 border-t border-gray-100">
                <li className="flex items-center space-x-2">
                  <span className="text-cyan-600 font-bold">✓</span>
                  <span>Wash cars parked in ParkShare bays</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-cyan-600 font-bold">✓</span>
                  <span>Direct doorstep customer appointments</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-cyan-600 font-bold">✓</span>
                  <span>Guaranteed slot bookings & instant pay</span>
                </li>
              </ul>
            </div>
            <Link
              to="/register/car-spa"
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-2xl text-xs transition text-center shadow-md block"
            >
              Register Car Spa Partner →
            </Link>
          </div>
        </div>
      </section>

      {/* Space Types Supported */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">What Parking Spaces Can You List?</h2>
          <p className="text-gray-600 mt-2">Any safe private space with vehicle access can generate passive earnings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 space-y-4 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800 mx-auto">
              <Home className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Residential Driveways & Garages</h3>
            <p className="text-gray-600 text-sm">
              Vacant house driveways, covered carports, or private home garages available while you are at work.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 space-y-4 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800 mx-auto">
              <Building className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Apartment & Society Bays</h3>
            <p className="text-gray-600 text-sm">
              Unused assigned basement parking slots or designated society visitor bays.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 space-y-4 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800 mx-auto">
              <Warehouse className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Commercial & Shop Lots</h3>
            <p className="text-gray-600 text-sm">
              Off-peak office lots, store parking bays, or vacant commercial land.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
