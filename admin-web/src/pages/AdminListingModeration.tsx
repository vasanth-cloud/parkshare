import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ParkingListing } from '../types';
import { CheckSquare, CheckCircle, XCircle, MapPin } from 'lucide-react';

export const AdminListingModeration: React.FC = () => {
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<Record<number, string>>({});

  const fetchPendingListings = () => {
    api.getPendingListings()
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPendingListings();
  }, []);

  const handleAction = async (id: number, status: 'ACTIVE' | 'REJECTED') => {
    try {
      await api.approveListing(id, status, rejectionReason[id]);
      fetchPendingListings();
    } catch (err: any) {
      alert(err.message || 'Moderation action failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
          <CheckSquare className="w-7 h-7 text-emerald-500" />
          <span>Space Listing Moderation Queue</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Review new host listings and approve or reject based on safety guidelines</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading pending listings...</div>
      ) : listings.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl p-12 text-center border border-slate-800 space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Pending Approvals</h3>
          <p className="text-sm text-slate-400">All submitted parking spaces have been moderated.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {listings.map((l) => (
            <div key={l.id} className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full">
                    {l.parking_type} • {l.status}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2">{l.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center space-x-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{l.approximate_address}</span>
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-1">
                  <div>City: <strong className="text-white">{l.city}</strong></div>
                  <div>Capacity: <strong className="text-white">{l.capacity} Slot(s)</strong></div>
                  <div>Rate: <strong className="text-emerald-400">₹{l.pricing_rule?.hourly_price || 40}/hr</strong></div>
                </div>
              </div>

              {/* Rejection input and Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="Rejection reason (if rejecting)..."
                  value={rejectionReason[l.id] || ''}
                  onChange={(e) => setRejectionReason({ ...rejectionReason, [l.id]: e.target.value })}
                  className="w-full sm:w-80 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <button
                    onClick={() => handleAction(l.id, 'REJECTED')}
                    className="flex-1 sm:flex-none bg-red-900 hover:bg-red-800 text-red-100 font-bold px-4 py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1 border border-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleAction(l.id, 'ACTIVE')}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1 shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve Space</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
