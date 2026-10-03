import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ParkingListing, HostSummary, VerificationStatus, Booking } from '../types';
import { HostIdentityVerificationModal } from '../components/HostIdentityVerificationModal';
import { RectifyListingModal } from '../components/RectifyListingModal';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, KeyRound, MapPin, Star, Power, CheckCircle, DollarSign, Calendar, Car, AlertCircle, X, ShieldCheck, ShieldAlert, RotateCcw, XCircle, Clock, Camera, Eye, Lock, Trash2 } from 'lucide-react';

export const HostDashboard: React.FC = () => {
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [summary, setSummary] = useState<HostSummary | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [generatedOtps, setGeneratedOtps] = useState<Record<number, { otp: string; expires_at: string }>>({});
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedListingForRectify, setSelectedListingForRectify] = useState<ParkingListing | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Space Listing Delete State
  const [deleteConfirmListing, setDeleteConfirmListing] = useState<{ id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDeleteListing = async () => {
    if (!deleteConfirmListing) return;
    setIsDeleting(true);
    try {
      await api.deleteListing(deleteConfirmListing.id);
      setListings((prev) => prev.filter((l) => l.id !== deleteConfirmListing.id));
      setDeleteConfirmListing(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete parking space');
    } finally {
      setIsDeleting(false);
    }
  };

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

  const handleConfirmKeyReceived = async (bookingId: number) => {
    try {
      setActionLoading(bookingId);
      await api.confirmKeyReceived(bookingId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm key handover');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateReleaseOtp = async (bookingId: number) => {
    try {
      setActionLoading(bookingId);
      const res = await api.generateReleaseOtp(bookingId);
      setGeneratedOtps((prev) => ({
        ...prev,
        [bookingId]: { otp: res.release_otp, expires_at: res.expires_at },
      }));
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate release OTP');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchData = async () => {
    try {
      const [listingsData, summaryData, verStatus, bookingsData] = await Promise.all([
        api.getMyListings(),
        api.getHostSummary().catch(() => null),
        api.getVerificationStatus().catch(() => null),
        api.getHostBookings().catch(() => []),
      ]);
      setListings(listingsData);
      setSummary(summaryData);
      setVerificationStatus(verStatus);
      setHostBookings(bookingsData || []);
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
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <span>Rejected</span>
            <span className="text-red-600 font-black text-sm leading-none">•</span>
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

      {/* Active Vehicle Handovers & Key Custody Section */}
      {hostBookings.some((b) =>
        [
          'CONFIRMED',
          'DRIVER_ARRIVED',
          'ODOMETER_PHOTO_SUBMITTED',
          'KEY_HANDOVER_PENDING',
          'KEY_RECEIVED',
          'PARKING_ACTIVE',
          'ACTIVE',
          'VEHICLE_COLLECTION_REQUESTED',
        ].includes(b.status)
      ) && (
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 shadow-xl border border-emerald-500/40 text-white space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/60 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white flex items-center space-x-2">
                  <span>Active Vehicle Handovers & Key Custody</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                </h2>
                <p className="text-xs text-emerald-200/80">
                  Manage incoming driver arrivals, verify mileage inspection photos, and confirm key receipt & release.
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchData()}
              className="text-xs font-bold text-emerald-300 hover:text-white bg-emerald-900/60 hover:bg-emerald-900 px-3.5 py-1.5 rounded-xl border border-emerald-700/60 transition flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Handovers</span>
            </button>
          </div>

          <div className="space-y-4">
            {hostBookings
              .filter((b) =>
                [
                  'CONFIRMED',
                  'DRIVER_ARRIVED',
                  'ODOMETER_PHOTO_SUBMITTED',
                  'KEY_HANDOVER_PENDING',
                  'KEY_RECEIVED',
                  'PARKING_ACTIVE',
                  'ACTIVE',
                  'VEHICLE_COLLECTION_REQUESTED',
                ].includes(b.status)
              )
              .map((b) => {
                const isArrivedOrPendingKey =
                  b.status === 'DRIVER_ARRIVED' ||
                  b.status === 'ODOMETER_PHOTO_SUBMITTED' ||
                  b.status === 'KEY_HANDOVER_PENDING';
                const isCollectionStage = b.status === 'VEHICLE_COLLECTION_REQUESTED';
                const isParkingActive =
                  b.status === 'PARKING_ACTIVE' || b.status === 'KEY_RECEIVED' || b.status === 'ACTIVE';

                let exteriorParsed: Record<string, string> = {};
                try {
                  if (b.exterior_photos) exteriorParsed = JSON.parse(b.exterior_photos);
                } catch {}

                const activeOtp = generatedOtps[b.id];

                return (
                  <div
                    key={b.id}
                    className={`rounded-2xl p-5 border transition ${
                      isCollectionStage
                        ? 'bg-amber-950/40 border-amber-500/80 shadow-lg'
                        : isArrivedOrPendingKey
                        ? 'bg-slate-900/90 border-emerald-500/80 shadow-lg'
                        : 'bg-slate-900/60 border-slate-700/80'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Booking & Vehicle Info */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700 px-3 py-1 rounded-full">
                            Ref: #{b.booking_reference}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            Slot {b.space_number || 'A01'} • {b.listing?.title}
                          </span>
                          {isCollectionStage && (
                            <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full animate-pulse">
                              🚨 Collection Requested
                            </span>
                          )}
                          {isArrivedOrPendingKey && (
                            <span className="bg-purple-600 text-white font-bold text-xs px-3 py-1 rounded-full animate-pulse">
                              Driver Arrived • Key Pending
                            </span>
                          )}
                          {isParkingActive && (
                            <span className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 rounded-full">
                              Key Received ✅ Parking Active
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <span className="text-white font-extrabold flex items-center space-x-1.5">
                            <Car className="w-4 h-4 text-emerald-400" />
                            <span>Plate: {b.vehicle?.registration_number || 'KA 01 AB 1234'}</span>
                          </span>

                          {b.odometer_reading && (
                            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-3 py-1 rounded-xl font-mono font-extrabold flex items-center space-x-1.5">
                              <span>Odometer: {b.odometer_reading.toLocaleString()} KM</span>
                              {b.odometer_photo_url && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotoModal(b.odometer_photo_url!)}
                                  className="text-emerald-400 hover:text-white underline text-[11px] ml-1 flex items-center space-x-0.5"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Photo</span>
                                </button>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Exterior Photos thumbnails if any */}
                        {Object.keys(exteriorParsed).length > 0 && (
                          <div className="flex items-center space-x-2 pt-1">
                            <span className="text-[11px] text-slate-400 font-bold uppercase">Exterior Photos:</span>
                            <div className="flex space-x-2">
                              {Object.entries(exteriorParsed).map(([side, url]) => (
                                <button
                                  key={side}
                                  type="button"
                                  onClick={() => setSelectedPhotoModal(url)}
                                  className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-400 w-10 h-10 bg-black flex items-center justify-center"
                                  title={`View ${side} photo`}
                                >
                                  <img src={url} alt={side} className="w-full h-full object-cover" />
                                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-bold text-white text-center capitalize">
                                    {side}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {b.damage_notes && (
                          <p className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded-xl border border-amber-900/50">
                            <strong>Driver Inspection Notes:</strong> "{b.damage_notes}"
                          </p>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        {isArrivedOrPendingKey && (
                          <div className="space-y-1 text-center sm:text-right">
                            <button
                              onClick={() => handleConfirmKeyReceived(b.id)}
                              disabled={actionLoading === b.id}
                              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition shadow-lg flex items-center justify-center space-x-2 hover:scale-[1.02]"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{actionLoading === b.id ? 'Confirming...' : '🔑 Confirm Key Received'}</span>
                            </button>
                            <span className="text-[10px] text-slate-400 block">
                              🔒 Release OTP locked until collection
                            </span>
                          </div>
                        )}

                        {isParkingActive && (
                          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs text-center space-y-1">
                            <span className="text-emerald-400 font-extrabold block">Key in Safe Custody</span>
                            <span className="text-[10px] text-slate-400">
                              Release OTP will activate when driver clicks "Collect My Vehicle".
                            </span>
                          </div>
                        )}

                        {isCollectionStage && (
                          <div className="space-y-2 text-center sm:text-right">
                            {activeOtp ? (
                              <div className="bg-amber-950/80 border-2 border-amber-400 p-3.5 rounded-2xl space-y-1 text-center shadow-lg">
                                <span className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider block">
                                  Provide Release OTP to Driver
                                </span>
                                <span className="text-2xl font-black font-mono text-white tracking-widest block bg-black/60 px-4 py-1.5 rounded-xl border border-amber-500/60">
                                  {activeOtp.otp}
                                </span>
                                <span className="text-[10px] text-amber-200/80 block">
                                  Valid for 10 min • Driver verifies on their phone
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGenerateReleaseOtp(b.id)}
                                disabled={actionLoading === b.id}
                                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-xs transition shadow-xl flex items-center justify-center space-x-2 hover:scale-[1.02]"
                              >
                                <Lock className="w-4 h-4" />
                                <span>
                                  {actionLoading === b.id
                                    ? 'Generating...'
                                    : '🔐 Generate Vehicle Release OTP'}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Dynamic Host Identity Verification Checklist */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Host Identity & Safety Verification</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Verified hosts unlock space submissions and display an official trust badge to drivers.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            {verificationStatus?.is_identity_verified ? (
              <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-3.5 py-1 rounded-full border border-emerald-300 flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Host</span>
              </span>
            ) : (
              <Link
                to="/verification"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center space-x-1 shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Complete Verification</span>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className={`p-3 rounded-xl border flex items-center space-x-2 font-semibold ${
            verificationStatus?.has_legal_name ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}>
            <CheckCircle className={`w-4 h-4 flex-shrink-0 ${verificationStatus?.has_legal_name ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span>Legal Name: <strong>{verificationStatus?.has_legal_name ? '✓ Verified' : 'Pending'}</strong></span>
          </div>

          <div className={`p-3 rounded-xl border flex items-center space-x-2 font-semibold ${
            verificationStatus?.phone_verified ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}>
            <CheckCircle className={`w-4 h-4 flex-shrink-0 ${verificationStatus?.phone_verified ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span>Mobile + OTP: <strong>{verificationStatus?.phone_verified ? '✓ Verified' : 'Pending'}</strong></span>
          </div>

          <div className={`p-3 rounded-xl border flex items-center space-x-2 font-semibold ${
            verificationStatus?.email_verified ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}>
            <CheckCircle className={`w-4 h-4 flex-shrink-0 ${verificationStatus?.email_verified ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span>Email: <strong>{verificationStatus?.email_verified ? '✓ Verified' : 'Pending'}</strong></span>
          </div>

          <div className={`p-3 rounded-xl border flex items-center space-x-2 font-semibold ${
            verificationStatus?.has_profile_photo ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}>
            <CheckCircle className={`w-4 h-4 flex-shrink-0 ${verificationStatus?.has_profile_photo ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span>Profile Photo: <strong>{verificationStatus?.has_profile_photo ? '✓ Uploaded' : 'Pending'}</strong></span>
          </div>

          <div className={`p-3 rounded-xl border flex items-center space-x-2 font-semibold ${
            verificationStatus?.has_gov_id ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}>
            <CheckCircle className={`w-4 h-4 flex-shrink-0 ${verificationStatus?.has_gov_id ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span>Gov ID: <strong>{verificationStatus?.has_gov_id ? `✓ ${verificationStatus.gov_id_type}` : 'Pending'}</strong></span>
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

                  {/* Prominent Admin Rejection Reason Alert */}
                  {l.status === 'REJECTED' && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 space-y-2 text-xs text-red-950 shadow-xs">
                      <div className="flex items-center space-x-2 font-extrabold text-red-800 text-sm">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>Space Listing Rejected by Admin</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-red-200/80 font-semibold text-xs text-red-900 leading-relaxed shadow-2xs">
                        <span className="text-gray-500 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Admin Rejection Reason:</span>
                        <span>"{l.rejection_reason || 'Photos or space details do not meet safety requirements. Please retake clear real photos on-site and resubmit.'}"</span>
                      </div>
                      <p className="text-[11px] text-red-700">
                        Click <strong>"Fix Issues & Resubmit Space"</strong> below to retake photos or adjust details for admin re-evaluation.
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-6 py-3.5 bg-emerald-50/50 border-t border-emerald-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Booking: <strong>{l.booking_mode === 'MANUAL_APPROVAL' ? 'Host Review' : 'Instant'}</strong>
                  </span>

                  {l.status === 'REJECTED' ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setDeleteConfirmListing({ id: l.id, title: l.title })}
                        className="flex items-center space-x-1.5 text-xs font-bold text-red-700 hover:text-white bg-red-100/90 hover:bg-red-600 border border-red-200 px-3 py-2 rounded-xl transition shadow-xs cursor-pointer"
                        title="Permanently delete this rejected space"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Space</span>
                      </button>
                      <button
                        onClick={() => setSelectedListingForRectify(l)}
                        className="flex items-center space-x-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 px-3.5 py-2 rounded-xl transition shadow-sm hover:scale-[1.02] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Fix Issues & Resubmit Space</span>
                      </button>
                    </div>
                  ) : l.status === 'PENDING_APPROVAL' ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Under Review</span>
                      </span>
                      <button
                        onClick={() => setSelectedListingForRectify(l)}
                        className="text-xs font-bold text-gray-700 hover:text-gray-900 bg-white px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
                      >
                        Edit Space
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(l.id)}
                      className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 hover:text-emerald-900 bg-white px-3.5 py-1.5 rounded-lg border border-emerald-200 transition shadow-2xs"
                    >
                      <Power className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{l.status === 'ACTIVE' ? 'Pause Space' : 'Activate Space'}</span>
                    </button>
                  )}
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

      {/* Host Identity Verification Modal */}
      <HostIdentityVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onSuccess={(status) => {
          setVerificationStatus(status);
          fetchData();
        }}
        initialPhone={user?.phone_number}
        initialEmail={user?.email}
        initialName={user?.full_name}
      />

      {/* Rectify / Resubmit Space Modal */}
      <RectifyListingModal
        isOpen={!!selectedListingForRectify}
        onClose={() => setSelectedListingForRectify(null)}
        listing={selectedListingForRectify}
        onSuccess={() => {
          fetchData();
          setSelectedListingForRectify(null);
        }}
      />

      {/* Odometer / Inspection Photo Full Zoom Modal */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-lg w-full space-y-4 text-center shadow-2xl relative">
            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="text-base font-extrabold text-white flex items-center justify-center space-x-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              <span>Inspection Photo Record</span>
            </h3>
            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-black max-h-96 flex items-center justify-center">
              <img src={selectedPhotoModal} alt="Inspection" className="max-h-96 w-auto object-contain" />
            </div>
            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Space Listing Delete Confirmation Modal */}
      {deleteConfirmListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-red-100 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">Delete Space Listing</h3>
                <p className="text-xs text-gray-500">Permanently delete rejected listing</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 leading-relaxed bg-red-50/70 p-4 rounded-2xl border border-red-100 space-y-1">
              <p>
                Are you sure you want to permanently delete <strong>"{deleteConfirmListing.title}"</strong> (ID #{deleteConfirmListing.id})?
              </p>
              <p className="text-[11px] text-red-700 font-medium">
                This will remove this rejected space from your host dashboard. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmListing(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteListing}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Space</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostDashboard;

