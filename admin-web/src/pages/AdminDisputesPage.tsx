import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Dispute } from '../types';
import { AlertTriangle, CheckCircle2, Clock, XCircle, ShieldAlert, User, MessageSquare, Send, ArrowLeft } from 'lucide-react';

export const AdminDisputesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const service = searchParams.get('service'); // 'parking' | 'drivers' | 'car-spa' | null

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Resolution modal state
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'UNDER_INVESTIGATION' | 'RESOLVED' | 'REJECTED'>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDisputes = () => {
    const filter = statusFilter === 'ALL' ? undefined : statusFilter;
    setLoading(true);
    api.getAdminDisputes(filter)
      .then(setDisputes)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter]);

  const handleOpenResolveModal = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolveStatus(dispute.status === 'OPEN' ? 'RESOLVED' : (dispute.status as any));
    setResolutionNotes(dispute.resolution_notes || '');
  };

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;
    if (!resolutionNotes.trim()) {
      alert('Please enter resolution notes explaining the decision.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.resolveAdminDispute(selectedDispute.id, resolveStatus, resolutionNotes.trim());
      setSelectedDispute(null);
      setResolutionNotes('');
      fetchDisputes();
    } catch (err: any) {
      alert(err.message || 'Failed to update dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: Dispute['status']) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center space-x-1 bg-amber-950 text-amber-300 border border-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>OPEN</span>
          </span>
        );
      case 'UNDER_INVESTIGATION':
        return (
          <span className="inline-flex items-center space-x-1 bg-blue-950 text-blue-300 border border-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-blue-400" />
            <span>UNDER INVESTIGATION</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center space-x-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>RESOLVED</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 bg-red-950 text-red-300 border border-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 text-red-400" />
            <span>REJECTED</span>
          </span>
        );
    }
  };

  // Filter disputes strictly according to the active service scope
  const filteredDisputes = disputes.filter((d) => {
    const cat = (d.category || '').toUpperCase();
    const desc = (d.description || '').toLowerCase();

    if (service === 'parking') {
      // ONLY show Parking Space disputes
      return (
        !cat.includes('DRIVER') &&
        !cat.includes('SPA') &&
        !desc.includes('acting driver') &&
        !desc.includes('car wash')
      );
    } else if (service === 'drivers') {
      // ONLY show Acting Driver disputes
      return cat.includes('DRIVER') || desc.includes('driver') || desc.includes('chauffeur');
    } else if (service === 'car-spa') {
      // ONLY show Car Spa disputes
      return cat.includes('SPA') || cat.includes('WASH') || desc.includes('spa') || desc.includes('wash') || desc.includes('detail');
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      
      {/* Back to Service Navigation */}
      <div>
        <Link
          to={
            service === 'parking'
              ? '/approvals'
              : service === 'drivers'
              ? '/drivers'
              : service === 'car-spa'
              ? '/car-spas'
              : '/'
          }
          className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>
            {service === 'parking'
              ? '← Back to Space Approvals'
              : service === 'drivers'
              ? '← Back to Acting Drivers'
              : service === 'car-spa'
              ? '← Back to Car Spas'
              : '← Back to Services'}
          </span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {service === 'parking' && (
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl">🅿️</span>
                <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                  <ShieldAlert className="w-6 h-6 text-emerald-500" />
                  <span>Parking Space Disputes & Reports</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Review complaints filed for parking spot reservations, blocked driveway access, and space inaccuracies
              </p>
            </div>
          )}

          {service === 'drivers' && (
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl">🧑‍✈️</span>
                <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                  <ShieldAlert className="w-6 h-6 text-indigo-500" />
                  <span>Acting Driver Disputes & Reports</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Review chauffeur no-show reports, trip delay complaints, and passenger grievances
              </p>
            </div>
          )}

          {service === 'car-spa' && (
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl">✨</span>
                <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                  <ShieldAlert className="w-6 h-6 text-cyan-500" />
                  <span>Car Spa & Detailing Disputes & Reports</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Review detailing service quality complaints, doorstep water wash delays, and workshop bay issues
              </p>
            </div>
          )}

          {!service && (
            <div>
              <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                <ShieldAlert className="w-7 h-7 text-emerald-500" />
                <span>Disputes & Reports Moderation</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Review marketplace complaints filed by customers and hosts, investigate, and enforce resolutions.
              </p>
            </div>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-medium">
          {['ALL', 'OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'REJECTED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl transition ${
                statusFilter === filter
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading complaints & reports...</div>
      ) : filteredDisputes.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl p-12 text-center border border-slate-800 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">
            {service === 'parking'
              ? 'No Parking Disputes Found'
              : service === 'drivers'
              ? 'No Acting Driver Disputes Found'
              : service === 'car-spa'
              ? 'No Car Spa Disputes Found'
              : 'No Disputes Found'}
          </h3>
          <p className="text-sm text-slate-400">
            There are currently no reported complaints matching this criteria for this service.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDisputes.map((dispute) => (
            <div key={dispute.id} className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold text-emerald-400">{dispute.dispute_reference}</span>
                    {getStatusBadge(dispute.status)}
                    <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md font-semibold">
                      Category: {dispute.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Booking Ref: <span className="font-mono text-slate-200">{dispute.booking_reference || `#${dispute.booking_id}`}</span> • Listed Space: <span className="text-slate-200">{dispute.listing_title || 'N/A'}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenResolveModal(dispute)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center space-x-1 self-start sm:self-auto"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{dispute.status === 'OPEN' ? 'Investigate & Resolve' : 'Update Resolution'}</span>
                </button>
              </div>

              {/* Reported details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-medium flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Reporter ({dispute.reporter_role})</span>
                  </div>
                  <div className="text-white font-bold">{dispute.reporter_name || `User #${dispute.reporter_id}`}</div>
                  <div className="text-slate-500 text-[11px]">Filed at: {new Date(dispute.created_at).toLocaleString()}</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-medium flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reported Party</span>
                  </div>
                  <div className="text-white font-bold">{dispute.reported_user_name || `User #${dispute.reported_user_id}`}</div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-1">
                <div className="text-slate-400 font-semibold">Report Description:</div>
                <p className="text-slate-200 leading-relaxed italic">"{dispute.description}"</p>
              </div>

              {/* Resolution Notes if available */}
              {dispute.resolution_notes && (
                <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-900/60 text-xs space-y-1">
                  <div className="text-emerald-400 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Admin Resolution Note:</span>
                  </div>
                  <p className="text-emerald-100">{dispute.resolution_notes}</p>
                  {dispute.resolved_at && (
                    <div className="text-[11px] text-emerald-500">
                      Resolved on: {new Date(dispute.resolved_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-emerald-500" />
                <span>Resolve Dispute: {selectedDispute.dispute_reference}</span>
              </h3>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitResolution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Dispute Action
                </label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="UNDER_INVESTIGATION">Keep Under Investigation</option>
                  <option value="RESOLVED">Resolve & Settle (Action Enforced)</option>
                  <option value="REJECTED">Reject Complaint (Invalid / Dismissed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Resolution Explanation & Notes
                </label>
                <textarea
                  rows={4}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Detail the outcome of the investigation, refund actions, penalties or dismissals..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Submit Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
