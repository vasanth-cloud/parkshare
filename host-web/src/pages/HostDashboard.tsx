import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ParkingListing, HostSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, KeyRound, MapPin, Star, Power, CheckCircle, DollarSign, Calendar, Car, AlertCircle, X } from 'lucide-react';

export const HostDashboard: React.FC = () => {
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [summary, setSummary] = useState<HostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Host Customer Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportBookingId, setReportBookingId] = useState<string>('');
  const [reportCategory, setReportCategory] = useState<string>('CUSTOMER_NO_SHOW');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);

  const handleHostReportSubmit = async () => {
    if (!reportDescription.trim()) {
      alert('Please enter a description of the customer issue.');
      return;
    }
    const bId = parseInt(reportBookingId) || (listings[0]?.id || 1);
    try {
      setSubmittingReport(true);
      await api.createDispute({
        booking_id: bId,
        category: reportCategory,
        description: reportDescription,
      });
      alert('Customer report submitted to ParkShare Admin investigation successfully.');
      setShowReportModal(false);
      setReportDescription('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit customer report');
    } finally {
      setSubmittingReport(false);
    }
  };


  const fetchData = async () => {
    try {
      const [listingsData, summaryData] = await Promise.all([
        api.getMyListings(),
        api.getHostSummary().catch(() => null),
      ]);
      setListings(listingsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (id: number) => {
    try {
      await api.toggleListingStatus(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle space status');
    }
  };

  const getGreeting = (name: string) => {
    const hour = new Date().getHours();
    let timeStr = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeStr = 'Good afternoon';
    } else if (hour >= 17) {
      timeStr = 'Good evening';
    }
    return `${timeStr}, ${name}`;
  };

  const hostFirstName = summary?.host_name || user?.full_name?.split(' ')[0] || 'Host';
  const earningsDisplay = `₹${(summary?.this_month_earnings || 0).toLocaleString('en-IN')}`;
  const upcomingDisplay = summary?.upcoming_bookings || 0;
  const activeDisplay = summary?.active_parking || 0;
  const ratingDisplay = summary && summary.rating > 0 ? `${summary.rating.toFixed(1)} ⭐` : '0.0 ⭐';

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span>Active</span>
            <span className="text-emerald-600 font-black text-sm leading-none">•</span>
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <span>Paused</span>
            <span className="text-gray-500 font-black text-sm leading-none">•</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span>Pending Approval</span>
            <span className="text-amber-600 font-black text-sm leading-none">•</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            <span>{status}</span>
            <span className="text-gray-400 font-black text-sm leading-none">•</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Time of Day Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {getGreeting(hostFirstName)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here is your daily parking space performance and active reservations overview.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs border border-amber-300"
          >
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span>Report Customer</span>
          </button>

          <Link
            to="/pin-verify"
            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs"
          >
            <KeyRound className="w-4 h-4 text-emerald-700" />
            <span>Verify Driver PIN</span>
          </Link>

          <Link
            to="/create-listing"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            <span>+ Add Parking Space</span>
          </Link>
        </div>

      </div>

      {/* Captain 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-gray-900 block">{earningsDisplay}</span>
            <span className="text-xs font-medium text-gray-500">This month's earnings</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 border border-emerald-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-gray-900 block">{upcomingDisplay}</span>
            <span className="text-xs font-medium text-gray-500">Upcoming bookings</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 border border-emerald-100">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-gray-900 block">{activeDisplay}</span>
            <span className="text-xs font-medium text-gray-500">Active parking</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 border border-emerald-100">
            <Car className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-emerald-700 block">{ratingDisplay}</span>
            <span className="text-xs font-medium text-gray-500">Rating</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
        </div>
      </div>

      {/* Host Verification Checklist */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>Host Verification</span>
          </h2>
          <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-3 py-1 rounded-full border border-emerald-300">
            Verified Host
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 font-semibold text-emerald-950 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Identity: <strong>✓ Verified</strong></span>
          </div>
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 font-semibold text-emerald-950 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Phone: <strong>✓ Verified</strong></span>
          </div>
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 font-semibold text-emerald-950 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Bank/UPI: <strong>✓ Verified</strong></span>
          </div>
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 font-semibold text-emerald-950 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Parking ownership: <strong>✓ Verified</strong></span>
          </div>
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 font-semibold text-emerald-950 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Listing: <strong>✓ Approved</strong></span>
          </div>
        </div>
      </div>

      {listings.some((l) => l.status === 'PENDING_APPROVAL') && (
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center space-x-3">
          <div className="text-xl">⏳</div>
          <div>
            <span className="font-extrabold text-sm block">Space Listing Pending Admin Review</span>
            <p className="text-gray-600 mt-0.5">
              To maintain marketplace safety and trust, newly listed residential driveways and private spaces are reviewed by ParkShare Admins. Your pending spaces will automatically become searchable on the Customer App once approved.
            </p>
          </div>
        </div>
      )}

      {/* Horizontal Divider */}
      <hr className="border-t border-gray-200 my-6" />

      {/* My Parking Spaces Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">My Parking Spaces</h2>
          <Link
            to="/create-listing"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Parking Space</span>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading parking spaces...</div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 space-y-4">
            <PlusCircle className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-bold text-gray-900">No Parking Spaces Listed Yet</h3>
            <p className="text-sm text-gray-500">List your driveway or garage slot to start receiving driver booking requests.</p>
            <Link
              to="/create-listing"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              + Add Parking Space
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listings.map((l) => (
              <div
                key={l.id}
                className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition"
              >
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-extrabold text-lg text-gray-900">{l.title}</h3>
                      <p className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>{l.approximate_address || `${l.area}, ${l.city}`}</span>
                      </p>
                    </div>

                    <div>{renderStatusBadge(l.status)}</div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                    <span className="font-extrabold text-emerald-800 text-sm">
                      ₹{l.pricing_rule?.hourly_price || 50}/hour
                    </span>
                    <span className="text-gray-500">
                      Capacity: <strong>{l.capacity} space(s)</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md font-semibold">
                      {l.parking_type}
                    </span>
                    {l.is_covered && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">Covered</span>}
                    {l.has_ev_charging && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium">EV Charging</span>}
                    {l.has_cctv && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium">CCTV</span>}
                  </div>
                </div>

                <div className="px-6 py-3.5 bg-emerald-50/50 border-t border-emerald-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Booking: <strong>{l.booking_mode === 'MANUAL_APPROVAL' ? 'Host Review' : 'Instant'}</strong>
                  </span>

                  <button
                    onClick={() => handleToggleStatus(l.id)}
                    className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 hover:text-emerald-900 bg-white px-3.5 py-1.5 rounded-lg border border-emerald-200 transition shadow-2xs"
                  >
                    <Power className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{l.status === 'ACTIVE' ? 'Pause Space' : 'Activate Space'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Host Customer Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-gray-200 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Report Customer / Parker Issue</span>
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-gray-600">
                Submit a customer report for admin investigation and platform record.
              </p>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5 uppercase text-[11px] tracking-wider">Select Customer Issue Category</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {[
                    { id: 'CUSTOMER_NO_SHOW', label: "Customer didn't arrive / No-show" },
                    { id: 'WRONG_VEHICLE', label: 'Wrong vehicle / size violation' },
                    { id: 'DAMAGE', label: 'Damage to property / gate' },
                    { id: 'SPACE_MISUSE', label: 'Misuse of space / overstay' },
                    { id: 'HOST_OTHER', label: 'Other host concern' },
                  ].map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center space-x-2.5 p-2.5 rounded-xl border cursor-pointer font-medium transition ${
                        reportCategory === cat.id
                          ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="hostReportCategory"
                        value={cat.id}
                        checked={reportCategory === cat.id}
                        onChange={(e) => setReportCategory(e.target.value)}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 uppercase text-[11px] tracking-wider">Incident Details</label>
                <textarea
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe the incident with dates, vehicle details, or property impact..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleHostReportSubmit}
                  disabled={submittingReport}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow-sm"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Customer Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostDashboard;

