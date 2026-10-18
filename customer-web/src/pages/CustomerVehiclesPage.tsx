import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Vehicle } from '../types';
import {
  ArrowLeft,
  Car,
  Plus,
  Trash2,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Camera,
  Layers,
  ChevronRight,
  Info,
  ShieldAlert
} from 'lucide-react';

const POPULAR_CAR_BRANDS = ['Hyundai', 'Tata Motors', 'Maruti Suzuki', 'Mahindra', 'Toyota', 'Kia', 'Honda'];
const POPULAR_BIKE_BRANDS = ['Royal Enfield', 'Honda', 'Yamaha', 'TVS', 'Bajaj', 'KTM', 'Ather'];

export const CustomerVehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [regNo, setRegNo] = useState('');
  const [vehicleType, setVehicleType] = useState<'CAR' | 'SUV' | 'BIKE' | 'SCOOTER'>('CAR');
  const [make, setMake] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchVehicles = () => {
    api.getVehicles().then(setVehicles).catch(console.error);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim()) return;
    setLoading(true);
    try {
      await api.addVehicle({
        registration_number: regNo.trim().toUpperCase().replace(/\s+/g, ' '),
        vehicle_type: vehicleType,
        make: make.trim() || undefined,
        is_default: vehicles.length === 0,
      });
      setRegNo('');
      setMake('');
      setShowAddForm(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vId: number, plate: string) => {
    if (!window.confirm(`Are you sure you want to remove vehicle ${plate} from your garage?`)) return;
    setDeletingId(vId);
    try {
      await api.deleteVehicle(vId);
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to remove vehicle');
    } finally {
      setDeletingId(null);
    }
  };

  const formatPlate = (plate: string) => {
    // E.g. KA01BF2031 -> KA 01 BF 2031
    const clean = plate.toUpperCase().replace(/\s+/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`;
    }
    return plate.toUpperCase();
  };

  const popularBrands = vehicleType === 'BIKE' || vehicleType === 'SCOOTER'
    ? POPULAR_BIKE_BRANDS
    : POPULAR_CAR_BRANDS;

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-6 px-4 max-w-md mx-auto space-y-5 font-sans transition-colors duration-200 pb-24">
      
      {/* 1. Header with Back Button & Add Vehicle Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>My Garage</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                {vehicles.length}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Digital vehicle passes & ANPR entry</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-2xl shadow-sm transition flex items-center space-x-1 cursor-pointer"
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showAddForm ? 'Cancel' : 'Add Vehicle'}</span>
        </button>
      </div>

      {/* 2. Interactive Add Vehicle Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleAddVehicle}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-blue-600 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Register to Garage</span>
            </span>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-bold">
              Instant Gate Sync
            </span>
          </div>

          {/* Vehicle Category Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Vehicle Category</label>
            <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              {[
                { type:'CAR', label:'Car', icon:''},
                { type:'BIKE', label:'Bike', icon:''},
                { type:'SUV', label:'SUV', icon:''},
                { type:'SCOOTER', label:'Scooter', icon:''},
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setVehicleType(item.type as any)}
                  className={`py-2 rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                    vehicleType === item.type
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-blue-500/20'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Indian HSRP License Plate Preview */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Plate Preview</label>
            <div className="bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-750 p-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 flex justify-center">
              <div className="bg-white rounded-xl border-2 border-slate-900 shadow-md flex items-center overflow-hidden max-w-[280px] w-full">
                {/* Left Blue IND Strip */}
                <div className="bg-[#0038A8] text-white flex flex-col items-center justify-center px-2 py-1.5 self-stretch border-r border-slate-300">
                  <div className="w-3.5 h-3.5 rounded-full border border-amber-300 flex items-center justify-center text-[7px] font-black text-amber-300">
                    
                  </div>
                  <span className="text-[10px] font-black tracking-tighter mt-0.5 leading-none">IND</span>
                </div>
                {/* License Text */}
                <div className="flex-1 text-center py-1.5 px-3">
                  <span className="font-mono font-black text-lg sm:text-xl text-slate-950 tracking-[0.2em]">
                    {regNo ? regNo.toUpperCase() : 'KA 01 AB 1234'}
                  </span>
                </div>
                {/* Right Hologram */}
                <div className="pr-2 text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                  HSRP
                </div>
              </div>
            </div>
          </div>

          {/* Plate Input */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Enter Registration Number</label>
            <input
              type="text"
              required
              placeholder="e.g. KA 01 BF 2031"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wider"
            />
          </div>

          {/* Make / Model with Brand Shortcuts */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Make & Brand (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Hyundai Creta / Royal Enfield Classic"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Quick Brand Pills */}
            <div className="flex flex-wrap gap-1 mt-2">
              {popularBrands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setMake(b)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                    make === b
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !regNo.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Registering Vehicle...' : 'Add Vehicle to My Garage'}</span>
          </button>
        </form>
      )}

      {/* 3. Empty State or Vehicle Digital Cards */}
      {vehicles.length === 0 && !showAddForm ? (
        <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-3xl p-6 text-center border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-full animate-ping" />
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-3xl shadow-sm">
              
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Your Garage is Empty</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Add your vehicle registration number to enable instant gate boom barrier entry and 1-tap spot reservation.
            </p>
          </div>

          {/* Feature List */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 text-left space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span><strong>Instant Barrier Lift:</strong> Automatic camera plate recognition</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span><strong>1-Tap Checkout:</strong> Auto-fills your plate on booking</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span><strong>Tamper-Proof Pass:</strong> Verified vehicle gate credentials</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Your First Vehicle</span>
          </button>
        </div>
      ) : (
        /* Vehicles List: Modern High-End HSRP Garage Pass Cards */
        <div className="space-y-4">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white rounded-3xl p-5 border border-slate-700/80 shadow-lg space-y-4 relative overflow-hidden group"
            >
              {/* Subtle shimmery accent glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Card Top: Category & Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/10 flex items-center space-x-1">
                    <span>{v.vehicle_type ==='BIKE'|| v.vehicle_type ==='SCOOTER'?'TWO-WHEELER':'FOUR-WHEELER'}</span>
                  </span>
                  {v.is_default && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                      <span>★ Default</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteVehicle(v.id, v.registration_number)}
                  disabled={deletingId === v.id}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-rose-500/30 text-slate-300 hover:text-rose-300 flex items-center justify-center transition cursor-pointer"
                  title="Remove Vehicle"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Realistic Authentic Indian HSRP License Plate */}
              <div className="bg-white rounded-2xl py-2 px-3 border-2 border-slate-950 shadow-md flex items-center justify-between">
                {/* Left Blue IND Strip */}
                <div className="bg-[#0038A8] text-white flex flex-col items-center justify-center px-2 py-1 rounded-lg self-stretch">
                  <div className="w-3 h-3 rounded-full border border-amber-300 flex items-center justify-center text-[6px] font-black text-amber-300">
                    
                  </div>
                  <span className="text-[9px] font-black tracking-tighter mt-0.5 leading-none">IND</span>
                </div>

                {/* License Number */}
                <div className="flex-1 text-center px-2">
                  <span className="font-mono font-black text-lg sm:text-xl text-slate-950 tracking-[0.18em]">
                    {formatPlate(v.registration_number)}
                  </span>
                </div>

                {/* Right HSRP Hologram Tag */}
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter border-l border-slate-200 pl-2">
                  HSRP
                </div>
              </div>

              {/* Vehicle Sub-info & ANPR status */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">VEHICLE BRAND</span>
                  <span className="font-extrabold text-white text-xs">
                    {v.make || (v.vehicle_type === 'BIKE' ? 'Standard Motorcycle' : 'Passenger Car')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">BARRIER SENSOR</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ANPR Active</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Smart Gate & Barrier Info (Fills empty space with rich value!) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Smart Boom Barrier Entry
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">How automatic camera scanning works</p>
          </div>
        </div>

        {/* 3 Step Visual Mini Flow */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <span className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 block">1. Approach</span>
            <span className="text-[9px] text-slate-500 leading-tight block">Camera reads plate</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <span className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 block">2. Gate Opens</span>
            <span className="text-[9px] text-slate-500 leading-tight block">Barrier lifts in 2s</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <span className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 block">3. Park Slot</span>
            <span className="text-[9px] text-slate-500 leading-tight block">Zero ticket queues</span>
          </div>
        </div>

        <div className="bg-blue-50/60 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200/60 dark:border-blue-800 flex items-start space-x-2 text-[11px] text-blue-900 dark:text-blue-300">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <span>
            Visiting in another vehicle? You can add up to 5 vehicles and select any vehicle during spot reservation.
          </span>
        </div>
      </div>

      {/* 5. Garage Security Assurance */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 dark:text-white block">ParkCo Verified Plates</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Encrypted credentials & secure parking</span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          ✓ Active
        </span>
      </div>

    </div>
  );
};
