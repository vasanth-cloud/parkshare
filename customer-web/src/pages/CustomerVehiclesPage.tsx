import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Vehicle } from '../types';
import { Car, Plus, CheckCircle, Trash2 } from 'lucide-react';

export const CustomerVehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [regNo, setRegNo] = useState('');
  const [vehicleType, setVehicleType] = useState<'CAR' | 'SUV' | 'BIKE' | 'SCOOTER' | 'VAN'>('CAR');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchVehicles = () => {
    api.getVehicles().then(setVehicles).catch(console.error);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo) return;
    setLoading(true);
    try {
      await api.addVehicle({
        registration_number: regNo,
        vehicle_type: vehicleType,
        make,
        model,
        is_default: vehicles.length === 0,
      });
      setRegNo('');
      setMake('');
      setModel('');
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center space-x-2">
          <Car className="w-7 h-7 text-emerald-600" />
          <span>My Vehicles</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">Manage registration details for easy parking slot assignment</p>
      </div>

      {/* Add Vehicle Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          <span>Add New Vehicle</span>
        </h2>

        <form onSubmit={handleAddVehicle} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Registration Plate #</label>
            <input
              type="text"
              required
              placeholder="e.g. KA-01-AB-1234"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Vehicle Type</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="CAR">Car / Hatchback</option>
              <option value="SUV">SUV / Sedan</option>
              <option value="BIKE">Two-Wheeler / Bike</option>
              <option value="SCOOTER">Scooter</option>
              <option value="VAN">Van / Commercial</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Make & Model</label>
            <input
              type="text"
              placeholder="e.g. Hyundai i20"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
            >
              {loading ? 'Adding...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </div>

      {/* Vehicle List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Saved Vehicles</h2>
        {vehicles.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-500 border border-gray-200">
            No registered vehicles found. Add your primary car or bike above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex justify-between items-center"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-base text-gray-900 block font-mono">{v.registration_number}</span>
                    <span className="text-xs text-gray-500">{v.vehicle_type} {v.make ? `• ${v.make}` : ''}</span>
                  </div>
                </div>

                {v.is_default && (
                  <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-full flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Default</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
