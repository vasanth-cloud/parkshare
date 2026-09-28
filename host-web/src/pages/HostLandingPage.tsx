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

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {user ? (
              <Link
                to="/create-listing"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3.5 rounded-xl transition shadow-lg flex items-center space-x-2 text-base"
              >
                <PlusCircle className="w-5 h-5" />
                <span>List a New Parking Space</span>
              </Link>
            ) : (
              <Link
                to="/auth"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3.5 rounded-xl transition shadow-lg flex items-center space-x-2 text-base"
              >
                <span>Register as Space Host</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
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
