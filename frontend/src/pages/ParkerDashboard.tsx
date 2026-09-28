import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Car, Clock, ShieldCheck, MapPin, Plus, CheckCircle, Navigation, QrCode, AlertCircle } from 'lucide-react';
import { Booking, Vehicle } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ParkerDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // New Vehicle form state
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vType, setVType] = useState<'CAR' | 'SUV' | 'BIKE'>('CAR');

  const { user } = useAuth();

  const loadData = async () => {
    try {
      const [bData, vData] = await Promise.all([
        api.getMyBookings(),
        api.getVehicles(),
      ]);
      setBookings(bData);
      setVehicles(vData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addVehicle({
        registration_number: plate,
        make,
        model,
        vehicle_type: vType,
        is_default: vehicles.length === 0,
      });
      setPlate('');
      setMake('');
      setModel('');
      setShowAddVehicle(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const activeBooking = bookings.find((b) => b.status === 'CONFIRMED' || b.status === 'ACTIVE');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-xl">
        <div>
          <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Parker Dashboard</span>
          <h1 className="text-3xl font-extrabold mt-1">Hello, {user?.full_name}</h1>
          <p className="text-emerald-100 text-xs mt-1">Manage your parking passes, saved vehicles, and reservation history.</p>
        </div>
      </div>

      {/* ACTIVE PARKING PASS CARD (QR + PIN + EXACT LOCATION REVEAL) */}
      {activeBooking && activeBooking.listing && (
        <div className="bg-white rounded-3xl p-6 border-2 border-emerald-500 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
                Active Parking Booking Pass
              </span>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-700">
              Ref: {activeBooking.booking_reference}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* QR Code Pass */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
              <QRCodeSVG value={activeBooking.qr_token} size={150} level="H" />
              <p className="mt-3 text-[11px] text-slate-500 font-medium">Show QR Code at Parking Entrance</p>
              
              {/* 4-Digit Verification PIN */}
              <div className="mt-3 bg-emerald-600 text-white px-4 py-1.5 rounded-xl font-mono text-sm font-bold shadow-sm">
                PIN: {activeBooking.verification_code}
              </div>
            </div>

            {/* Confirmed Exact Address Reveal */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{activeBooking.listing.title}</h3>
                <div className="mt-2 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                  <div className="flex items-start space-x-2 text-emerald-900 text-xs font-semibold mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Exact Location Unlocked (Confirmed Booking)</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {activeBooking.listing.exact_address}
                  </p>
                  {activeBooking.listing.access_instructions && (
                    <p className="text-xs text-slate-600 mt-2 italic bg-white/80 p-2 rounded-lg border border-emerald-100">
                      Access Note: "{activeBooking.listing.access_instructions}"
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Start Time</span>
                  <span className="font-bold text-slate-900">{new Date(activeBooking.start_time).toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">End Time</span>
                  <span className="font-bold text-slate-900">{new Date(activeBooking.end_time).toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SAVED VEHICLES MANAGER */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Car className="w-5 h-5 text-emerald-600" />
            <span>My Vehicles</span>
          </h2>
          <button
            onClick={() => setShowAddVehicle(!showAddVehicle)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>

        {showAddVehicle && (
          <form onSubmit={handleAddVehicle} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              required
              placeholder="Reg Plate (e.g. TN38AB1234)"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              className="px-3 py-2 bg-white rounded-xl border text-xs"
            />
            <input
              type="text"
              placeholder="Make (e.g. Hyundai)"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="px-3 py-2 bg-white rounded-xl border text-xs"
            />
            <input
              type="text"
              placeholder="Model (e.g. i20)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="px-3 py-2 bg-white rounded-xl border text-xs"
            />
            <button type="submit" className="py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs">
              Save Vehicle
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {vehicles.map((v) => (
            <div key={v.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-sm text-slate-900">{v.registration_number}</span>
                <p className="text-xs text-slate-500">{v.make} {v.model} ({v.vehicle_type})</p>
              </div>
              {v.is_default && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Default</span>}
            </div>
          ))}
        </div>
      </div>

      {/* BOOKING HISTORY */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Booking History</h2>
        
        <div className="divide-y divide-slate-100">
          {bookings.map((b) => (
            <div key={b.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-sm text-slate-900">{b.listing?.title || 'Parking Space'}</span>
                <p className="text-slate-500">{new Date(b.start_time).toLocaleString()} — {new Date(b.end_time).toLocaleString()}</p>
                <span className="font-mono text-slate-400">Ref: {b.booking_reference}</span>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                  b.status === 'CONFIRMED' || b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {b.status}
                </span>
                <span className="font-bold text-slate-900 text-sm">₹{b.total_amount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
