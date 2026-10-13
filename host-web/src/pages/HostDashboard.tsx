import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getFullImageUrl } from '../services/api';
import { ParkingListing, HostSummary, VerificationStatus, Booking } from '../types';
import { HostIdentityVerificationModal } from '../components/HostIdentityVerificationModal';
import { RectifyListingModal } from '../components/RectifyListingModal';
import { useAuth } from '../context/AuthContext';
import { HostAvatar } from '../components/HostAvatar';
import { PlusCircle, MapPin, Star, Power, CheckCircle, CheckCircle2, ArrowRight, DollarSign, Calendar, Car, AlertCircle, X, ShieldCheck, ShieldAlert, RotateCcw, XCircle, Clock, Trash2 } from 'lucide-react';

export const HostDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [summary, setSummary] = useState<HostSummary | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedListingForRectify, setSelectedListingForRectify] = useState<ParkingListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingFilter, setListingFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');
  const { user } = useAuth();

  const formatCleanAddress = (l: ParkingListing): string => {
    if (l.area && l.city) {
      return `${l.area}, ${l.city}`;
    }
    if (!l.approximate_address) return [l.area, l.city, l.state].filter(Boolean).join(', ') || 'Listing Location';
    const rawParts = l.approximate_address.split(',').map((s) => s.trim());
    const filtered = rawParts.filter(
      (p) =>
        p &&
        !p.toLowerCase().includes('corporation') &&
        !p.toLowerCase().includes('ward') &&
        !p.toLowerCase().includes('urban') &&
        p.toLowerCase() !== 'india' &&
        !/^\d{6}$/.test(p)
    );
    const seen = new Set<string>();
    const chosen: string[] = [];
    for (const item of filtered) {
      const lower = item.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        chosen.push(item);
      }
      if (chosen.length >= 2) break;
    }
    return chosen.join(', ') || l.approximate_address.substring(0, 32);
  };

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



  const fetchData = async () => {
    try {
      const [listingsData, summaryData, verStatus, bookingsData] = await Promise.all([
        api.getMyListings().catch((err) => {
          console.warn('Could not fetch listings:', err);
          return [];
        }),
        api.getHostSummary().catch(() => null),
        api.getVerificationStatus().catch(() => null),
        api.getHostBookings().catch(() => []),
      ]);
      setListings(listingsData || []);
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
  const activeSpacesCount = listings.filter((l) => l.status === 'ACTIVE').length;
  const upcomingCount = Math.max(
    summary?.upcoming_bookings ?? 0,
    hostBookings.filter(
      (b) =>
        b.status === 'CONFIRMED' ||
        b.status === 'DRIVER_ARRIVED' ||
        b.status === 'KEY_HANDOVER_PENDING' ||
        b.status === 'BOOKING_CREATED' ||
        b.status === 'PARKING_ACTIVE' ||
        b.status === 'VEHICLE_COLLECTION_REQUESTED'
    ).length
  );
  const ratingDisplay = summary && summary.rating > 0 ? `${summary.rating.toFixed(1)} ⭐` : '0.0 ⭐';

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Active</span>
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <span>Paused</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            <Clock className="w-3 h-3 text-amber-700 flex-shrink-0" />
            <span>Under Review</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
            <span>Needs Fix</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-slate-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-gray-900 dark:text-slate-100 py-4 sm:py-6 px-3.5 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-5 pb-28 transition-colors duration-200">
      {/* Sleek Greeting Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 transition-colors duration-200">
        <div className="flex items-center space-x-3.5 min-w-0">
          <HostAvatar
            url={user?.profile_photo_url}
            name={user?.full_name}
            size="lg"
            className="border-2 border-emerald-500 shadow-sm"
          />
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/80">
                Host Portal
              </span>
              {verificationStatus?.is_identity_verified && (
                <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate mt-0.5">
              {getGreeting(hostFirstName)}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => fetchData()}
            className="text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-2xs border border-transparent dark:border-slate-700 cursor-pointer"
            title="Refresh Data"
          >
            <RotateCcw className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2x2 Mobile Grid / 4-Col Desktop Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Earnings */}
        <Link
          to="/earnings"
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-emerald-100/80 dark:border-emerald-950/60 shadow-2xs hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-800 transition flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Earnings</span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block tracking-tight">{earningsDisplay}</span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center space-x-1 mt-0.5">
              <span>View Payouts</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>

        {/* Active Parking Spaces */}
        <button
          type="button"
          onClick={() => {
            setListingFilter('ACTIVE');
            document.getElementById('my-parking-spaces')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-blue-100/80 dark:border-blue-950/60 shadow-2xs hover:shadow-sm hover:border-blue-300 dark:hover:border-blue-800 transition flex flex-col justify-between text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Active Spaces</span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 dark:bg-blue-950/60 rounded-xl flex items-center justify-center text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block tracking-tight">{activeSpacesCount}</span>
            <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold flex items-center space-x-1 mt-0.5">
              <span>Show active spaces</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </button>

        {/* Upcoming Reservations -> Navigate to Check-in */}
        <Link
          to="/pin-verify"
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-100/80 dark:border-indigo-950/60 shadow-2xs hover:shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Upcoming</span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl flex items-center justify-center text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block tracking-tight">{upcomingCount}</span>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold flex items-center space-x-1 mt-0.5">
              <span>Check-in PIN tool</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>

        {/* Host Rating */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-amber-100/80 dark:border-amber-950/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Rating</span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-50 dark:bg-amber-950/60 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100 dark:border-amber-900/60">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 block tracking-tight">{ratingDisplay}</span>
            <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5 block">Driver reviews</span>
          </div>
        </div>
      </div>




      {/* Compact & Attractive Host Identity Verification Card */}
      {verificationStatus?.is_identity_verified ? (
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-white dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-slate-900 rounded-2xl p-4 sm:p-5 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-700 dark:text-emerald-400 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Host Identity Verified</h2>
                <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Trust Badge Active</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Gov ID ({verificationStatus.gov_id_type || 'Aadhaar'}), Phone & Photo verified. Your listings display an official verified badge.
              </p>
            </div>
          </div>
          <Link
            to="/verification"
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-emerald-300 dark:border-emerald-700 px-3.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 self-start sm:self-center shadow-2xs"
          >
            <span>View KYC</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-white dark:from-amber-950/30 dark:via-orange-950/20 dark:to-slate-900 rounded-2xl p-4 sm:p-5 border border-amber-200/90 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Complete Host KYC Verification</h2>
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  {[
                    verificationStatus?.has_legal_name,
                    verificationStatus?.phone_verified,
                    verificationStatus?.email_verified,
                    verificationStatus?.has_profile_photo,
                    verificationStatus?.has_gov_id,
                  ].filter(Boolean).length}/5 Completed
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">
                Upload your Aadhaar/Gov ID and photo to get approved for space listings and build driver trust.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${verificationStatus?.has_gov_id ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'}`}>
                  {verificationStatus?.has_gov_id ? '✓ Gov ID' : '• Gov ID'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${verificationStatus?.has_profile_photo ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'}`}>
                  {verificationStatus?.has_profile_photo ? '✓ Photo' : '• Photo'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${verificationStatus?.phone_verified ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'}`}>
                  {verificationStatus?.phone_verified ? '✓ Mobile OTP' : '• Mobile OTP'}
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/verification"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1.5 self-start sm:self-center shadow-sm flex-shrink-0"
          >
            <span>Complete KYC</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}


      {/* Horizontal Divider */}
      <hr className="border-t border-gray-200 dark:border-slate-800 my-6" />

      {/* My Parking Spaces Section */}
      <div id="my-parking-spaces" className="space-y-4">
        {/* Header & Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">My Parking Spaces</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {listings.length}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Filter Pills */}
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-400 border border-transparent dark:border-slate-700">
              <button
                onClick={() => setListingFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  listingFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xs font-extrabold'
                    : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setListingFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  listingFilter === 'ACTIVE'
                    ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-2xs font-extrabold'
                    : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Active ({listings.filter((l) => l.status === 'ACTIVE').length})
              </button>
              <button
                onClick={() => setListingFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  listingFilter === 'PENDING'
                    ? 'bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-400 shadow-2xs font-extrabold'
                    : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Pending ({listings.filter((l) => l.status === 'PENDING_APPROVAL').length})
              </button>
            </div>

            <Link
              to="/create-listing"
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center space-x-1 shadow-xs flex-shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Space</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-slate-400 text-xs font-semibold">Loading parking spaces...</div>
        ) : listings.filter((l) => {
            if (listingFilter === 'ACTIVE') return l.status === 'ACTIVE';
            if (listingFilter === 'PENDING') return l.status === 'PENDING_APPROVAL';
            return true;
          }).length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-gray-200/80 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/60">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {listingFilter === 'ALL' ? 'No Parking Spaces Listed Yet' : `No ${listingFilter.toLowerCase()} spaces`}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              List your driveway, garage, or open slot to start receiving driver parking reservations.
            </p>
            <Link
              to="/create-listing"
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Parking Space</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings
              .filter((l) => {
                if (listingFilter === 'ACTIVE') return l.status === 'ACTIVE';
                if (listingFilter === 'PENDING') return l.status === 'PENDING_APPROVAL';
                return true;
              })
              .map((l) => {
                const coverImg = l.images && l.images.length > 0 ? getFullImageUrl(l.images[0].image_url) : null;

                return (
                  <div
                    key={l.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-4 space-y-3">
                      {/* Top Row: Thumbnail + Info */}
                      <div className="flex items-start gap-3">
                        {/* Photo Thumbnail */}
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-800 dark:to-slate-900 border border-emerald-100 dark:border-slate-700 flex-shrink-0 relative flex items-center justify-center">
                          {coverImg ? (
                            <img
                              src={coverImg}
                              alt={l.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-emerald-700 dark:text-emerald-400">
                              <Car className="w-7 h-7" />
                              <span className="text-[8px] font-black tracking-wider uppercase mt-0.5">🅿️ SPACE</span>
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 text-[9px] font-black bg-black/60 text-white px-1.5 py-0.2 rounded backdrop-blur-xs">
                            {l.capacity} {l.capacity === 1 ? 'spot' : 'spots'}
                          </span>
                        </div>

                        {/* Title & Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5">
                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white truncate" title={l.title}>
                              {l.title}
                            </h3>
                            <div className="flex-shrink-0 flex items-center flex-wrap gap-1">
                              {renderStatusBadge(l.status)}
                              {l.status === 'ACTIVE' && (() => {
                                const activeBookingsForListing = hostBookings.filter(
                                  (b) =>
                                    b.listing_id === l.id &&
                                    [
                                      'BOOKING_CREATED',
                                      'CONFIRMED',
                                      'DRIVER_ARRIVED',
                                      'ODOMETER_PHOTO_SUBMITTED',
                                      'KEY_HANDOVER_PENDING',
                                      'KEY_RECEIVED',
                                      'PARKING_ACTIVE',
                                      'ACTIVE',
                                      'VEHICLE_COLLECTION_REQUESTED',
                                      'RELEASE_OTP_VERIFIED',
                                    ].includes(b.status)
                                );
                                const occupiedCount = activeBookingsForListing.length;
                                if (occupiedCount >= l.capacity) {
                                  return (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                      <span>{occupiedCount}/{l.capacity} Booked (Full)</span>
                                    </span>
                                  );
                                }
                                if (occupiedCount > 0) {
                                  return (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                      <span>{occupiedCount}/{l.capacity} Booked</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span>Available (0/{l.capacity})</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Clean Short Address */}
                          <p
                            className="text-xs text-gray-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5 truncate"
                            title={l.approximate_address || `${l.area}, ${l.city}`}
                          >
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            <span className="truncate">{formatCleanAddress(l)}</span>
                          </p>

                          {/* Price & Badges */}
                          <div className="flex items-center flex-wrap gap-1.5 mt-2">
                            <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800 px-2 py-0.5 rounded-lg">
                              ₹{l.pricing_rule?.hourly_price || 40}/hr
                            </span>
                            <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg uppercase">
                              {l.parking_type.replace('_', ' ')}
                            </span>
                            {l.is_covered && (
                              <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded-md">
                                Covered
                              </span>
                            )}
                            {l.has_ev_charging && (
                              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-md">
                                EV
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Admin Rejection notice if any */}
                      {l.status === 'REJECTED' && (
                        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-3 space-y-1.5 text-xs text-red-950 dark:text-red-200">
                          <div className="flex items-center space-x-1.5 font-bold text-red-800 dark:text-red-300 text-xs">
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <span>Admin Action Required</span>
                          </div>
                          <p className="text-[11px] text-red-900 dark:text-red-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-red-200/60 dark:border-red-900/40 font-medium">
                            "{l.rejection_reason || 'Please retake clear photos on-site and resubmit.'}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Clean Bottom Action Bar */}
                    <div className="px-4 py-2.5 bg-gray-50/70 dark:bg-slate-950/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{l.booking_mode === 'MANUAL_APPROVAL' ? 'Host Review' : 'Instant Booking'}</span>
                      </span>

                      <div className="flex items-center space-x-1.5">
                        {l.status === 'REJECTED' ? (
                          <>
                            <button
                              onClick={() => setDeleteConfirmListing({ id: l.id, title: l.title })}
                              className="text-xs font-bold text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedListingForRectify(l)}
                              className="text-xs font-black text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl transition shadow-xs flex items-center space-x-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Fix & Resubmit</span>
                            </button>
                          </>
                        ) : l.status === 'PENDING_APPROVAL' ? (
                          <>
                            <button
                              onClick={() => setSelectedListingForRectify(l)}
                              className="text-xs font-bold text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl transition shadow-2xs"
                            >
                              Edit Space
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedListingForRectify(l)}
                              className="text-xs font-bold text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-xl transition shadow-2xs"
                              title="Edit Space Details"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(l.id)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center space-x-1 shadow-2xs cursor-pointer ${
                                l.status === 'ACTIVE'
                                  ? 'bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              <span>{l.status === 'ACTIVE' ? 'Pause' : 'Activate'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {/* Host Customer Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>Report Customer / Parker Issue</span>
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-gray-600 dark:text-slate-400">
                Submit a customer report for admin investigation and platform record.
              </p>

              <div>
                <label className="block text-gray-700 dark:text-slate-300 font-bold mb-1.5 uppercase text-[11px] tracking-wider">Select Customer Issue Category</label>
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
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-bold'
                          : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
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
                <label className="block text-gray-700 dark:text-slate-300 font-bold mb-1 uppercase text-[11px] tracking-wider">Incident Details</label>
                <textarea
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe the incident with dates, vehicle details, or property impact..."
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
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



      {/* Space Listing Delete Confirmation Modal */}
      {deleteConfirmListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full space-y-4 border border-red-100 dark:border-red-950/60 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/80 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Delete Space Listing</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Permanently delete rejected listing</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed bg-red-50/70 dark:bg-red-950/30 p-4 rounded-2xl border border-red-100 dark:border-red-900/50 space-y-1">
              <p>
                Are you sure you want to permanently delete <strong className="text-gray-900 dark:text-white">"{deleteConfirmListing.title}"</strong> (ID #{deleteConfirmListing.id})?
              </p>
              <p className="text-[11px] text-red-700 dark:text-red-400 font-medium">
                This will remove this rejected space from your host dashboard. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmListing(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
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

