import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, PlusCircle, QrCode, CheckCircle, Power, UserCheck, ShieldAlert, Key, MapPin } from 'lucide-react';
import { ParkingListing } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const HostDashboard: React.FC = () => {
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification PIN / QR Check-in Form
  const [verifyPin, setVerifyPin] = useState('');
  const [verifyRef, setVerifyRef] = useState('');
  const [verifyStatusMsg, setVerifyStatusMsg] = useState('');
  const [verifyErrorMsg, setVerifyErrorMsg] = useState('');

  const { user } = useAuth();

  const loadData = async () => {
    try {
      const data = await api.getMyListings();
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerifyCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyStatusMsg('');
    setVerifyErrorMsg('');
    try {
      await api.checkInSession({
        booking_reference: verifyRef,
        verification_code: verifyPin,
      });
      setVerifyStatusMsg('Parker checked in successfully! Session is ACTIVE.');
      setVerifyPin('');
      setVerifyRef('');
    } catch (err: any) {
      setVerifyErrorMsg(err.message || 'Verification failed');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await api.toggleListingStatus(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Earnings */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-xl">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Host Control Center</span>
          <h1 className="text-3xl font-extrabold mt-1">Hello, {user?.full_name}</h1>
          <p className="text-slate-300 text-xs mt-1">Manage your parking listings, verify incoming parkers, and track earnings.</p>
        </div>

        <Link
          to="/host/listings/new"
          className="mt-4 md:mt-0 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center space-x-2 text-sm"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Add New Parking Space</span>
        </Link>
      </div>

      {/* OPERATOR CHECK-IN SCANNER & PIN VERIFICATION WIDGET */}
      <div className="bg-white rounded-3xl p-6 border-2 border-emerald-500 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <QrCode className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">Check-in Parker Verification</h2>
        </div>

        {verifyStatusMsg && (
          <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-200 font-semibold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{verifyStatusMsg}</span>
          </div>
        )}

        {verifyErrorMsg && (
          <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-200">
            {verifyErrorMsg}
          </div>
        )}

        <form onSubmit={handleVerifyCheckIn} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Booking Ref (e.g. PKR-849201)"
            value={verifyRef}
            onChange={(e) => setVerifyRef(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
          />

          <input
            type="text"
            required
            placeholder="4-Digit PIN (e.g. 7392)"
            value={verifyPin}
            onChange={(e) => setVerifyPin(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none font-mono"
          />

          <button
            type="submit"
            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all"
          >
            Verify & Check In
          </button>
        </form>
      </div>

      {/* MY LISTINGS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">My Parking Spaces ({listings.length})</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((l) => (
            <div key={l.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    l.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {l.status}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">{l.parking_type}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{l.title}</h3>
                <p className="text-xs text-slate-500">{l.exact_address || l.approximate_address}</p>
                <p className="text-xs font-bold text-emerald-700 mt-2">₹{l.pricing_rule?.hourly_price || 30} / hour</p>
              </div>

              <button
                onClick={() => handleToggleStatus(l.id)}
                className={`p-2 rounded-xl transition-colors ${
                  l.status === 'ACTIVE' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
                title={l.status === 'ACTIVE' ? 'Pause Listing' : 'Activate Listing'}
              >
                <Power className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
