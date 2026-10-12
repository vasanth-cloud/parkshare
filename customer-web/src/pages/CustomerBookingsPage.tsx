import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Booking, CancellationPreview } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Key,
  CheckCircle,
  Car,
  AlertCircle,
  XCircle,
  Star,
  CreditCard,
  QrCode,
  Navigation,
  X,
  ChevronRight,
  ShieldCheck,
  Phone,
  Sparkles,
  Layers,
  UserCheck,
  Check,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { ActiveParkingCard } from '../components/ActiveParkingCard';

interface DriverBookingItem {
  bookingId: string;
  driver: {
    name: string;
    rating: number;
    trips: number;
    phone: string;
    photo?: string;
    carTypes?: string[];
  };
  tripType: string;
  pickupLocation: string;
  durationHours: number;
  totalFare: number;
  otp: number;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

interface SpaBookingItem {
  id: string;
  packageName: string;
  price: number;
  date: string;
  timeSlot: string;
  address: string;
  vehicleCategory: string;
  otp: number;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export const CustomerBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Detect if user came from a specific service page (e.g. ?service=parking or ?category=parking)
  const serviceParam = (searchParams.get('service') || searchParams.get('category') || '').toLowerCase();
  const isParkingOnly = serviceParam === 'parking';
  const isDriversOnly = serviceParam === 'drivers';
  const isSpaOnly = serviceParam === 'car_spa' || serviceParam === 'spa';
  const isServiceLocked = isParkingOnly || isDriversOnly || isSpaOnly;

  // Active Classification Filter:
  // If service is locked (e.g. from parking service page), lock to that service.
  // Otherwise, default to ALL or user selection.
  const [serviceClassification, setServiceClassification] = useState<'ALL' | 'PARKING' | 'DRIVERS' | 'CAR_SPA'>(
    isParkingOnly ? 'PARKING' : isDriversOnly ? 'DRIVERS' : isSpaOnly ? 'CAR_SPA' : 'ALL'
  );

  useEffect(() => {
    if (isParkingOnly) setServiceClassification('PARKING');
    else if (isDriversOnly) setServiceClassification('DRIVERS');
    else if (isSpaOnly) setServiceClassification('CAR_SPA');
  }, [serviceParam]);

  const [parkingBookings, setParkingBookings] = useState<Booking[]>([]);
  const [driverBookings, setDriverBookings] = useState<DriverBookingItem[]>([]);
  const [spaBookings, setSpaBookings] = useState<SpaBookingItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Modal States
  const [accessPassBooking, setAccessPassBooking] = useState<Booking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  // Review Modal
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadLocalBookings = () => {
    // Only load drivers if not locked to another service
    if (!isParkingOnly && !isSpaOnly) {
      try {
        const storedDrivers = JSON.parse(localStorage.getItem('parkshare_driver_bookings') || '[]');
        setDriverBookings(storedDrivers);
      } catch {
        setDriverBookings([]);
      }
    } else {
      setDriverBookings([]);
    }

    // Only load spa if not locked to another service
    if (!isParkingOnly && !isDriversOnly) {
      try {
        const storedSpa = JSON.parse(localStorage.getItem('parkshare_spa_bookings') || '[]');
        setSpaBookings(storedSpa);
      } catch {
        setSpaBookings([]);
      }
    } else {
      setSpaBookings([]);
    }
  };

  const fetchBookings = () => {
    setLoading(true);
    // If not locked to driver or spa, fetch parking
    if (!isDriversOnly && !isSpaOnly) {
      api.getMyBookings()
        .then((data) => {
          setParkingBookings(data || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setParkingBookings([]);
      setLoading(false);
    }

    loadLocalBookings();
  };

  useEffect(() => {
    fetchBookings();
  }, [serviceParam]);

  const handleClassificationChange = (cls: 'ALL' | 'PARKING' | 'DRIVERS' | 'CAR_SPA') => {
    setServiceClassification(cls);
    if (cls === 'ALL') {
      searchParams.delete('category');
      searchParams.delete('service');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: cls.toLowerCase() });
    }
  };

  // Filter Parking Active vs History
  const activeParking = parkingBookings.filter((b) =>
    ['CONFIRMED', 'PENDING_PAYMENT', 'ACTIVE', 'PARKING_ACTIVE', 'KEY_RECEIVED', 'KEY_HANDOVER_PENDING', 'DRIVER_ARRIVED', 'ODOMETER_PHOTO_SUBMITTED', 'VEHICLE_COLLECTION_REQUESTED', 'BOOKING_CREATED'].includes(b.status)
  );
  const historyParking = parkingBookings.filter((b) =>
    ['COMPLETED', 'CANCELLED', 'EXPIRED', 'VEHICLE_RELEASED', 'REJECTED'].includes(b.status)
  );

  // Filter Driver Active vs History
  const activeDrivers = driverBookings.filter((d) => d.status === 'CONFIRMED');
  const historyDrivers = driverBookings.filter((d) => ['COMPLETED', 'CANCELLED'].includes(d.status));

  // Filter Spa Active vs History
  const activeSpa = spaBookings.filter((s) => s.status === 'CONFIRMED');
  const historySpa = spaBookings.filter((s) => ['COMPLETED', 'CANCELLED'].includes(s.status));

  // Compute counts
  const totalActive = isParkingOnly
    ? activeParking.length
    : isDriversOnly
    ? activeDrivers.length
    : isSpaOnly
    ? activeSpa.length
    : (activeParking.length + activeDrivers.length + activeSpa.length);

  const totalHistory = isParkingOnly
    ? historyParking.length
    : isDriversOnly
    ? historyDrivers.length
    : isSpaOnly
    ? historySpa.length
    : (historyParking.length + historyDrivers.length + historySpa.length);

  const currentTotal = activeTab === 'ACTIVE' ? totalActive : totalHistory;

  const handlePayPendingBooking = async (b: Booking) => {
    try {
      setPayingBookingId(b.id);
      const orderData = await api.createPaymentOrder(b.id);
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        alert('Payment service unavailable. Please refresh.');
        setPayingBookingId(null);
        return;
      }

      const options = {
        key: orderData.key_id || 'rzp_test_TjLLsOAid1sNkb',
        amount: orderData.amount_in_paise || Math.round((orderData.amount || b.total_amount) * 100),
        currency: orderData.currency || 'INR',
        name: 'ParkShare Parking',
        description: `Booking #${b.booking_reference}`,
        order_id: orderData.order_id,
        theme: { color: '#0f172a' },
        modal: { ondismiss: () => setPayingBookingId(null) },
        handler: async (response: any) => {
          try {
            await api.verifyPayment({
              booking_id: b.id,
              order_id: response.razorpay_order_id || orderData.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            fetchBookings();
          } catch (err: any) {
            alert(err.message || 'Payment verification failed');
          } finally {
            setPayingBookingId(null);
          }
        },
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', () => setPayingBookingId(null));
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Failed to initiate payment');
      setPayingBookingId(null);
    }
  };

  const handleOpenCancelModal = (b: Booking) => {
    setSelectedBooking(b);
    setReason('');
    setPreview(null);
    setPreviewLoading(true);

    api.previewCancellation(b.id)
      .then(setPreview)
      .catch(console.error)
      .finally(() => setPreviewLoading(false));
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;
    try {
      setCancelling(true);
      await api.cancelBooking(selectedBooking.id, reason);
      setSelectedBooking(null);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelDriverBooking = (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this acting driver booking?')) return;
    const updated = driverBookings.map((d) => d.bookingId === bookingId ? { ...d, status: 'CANCELLED' as const } : d);
    setDriverBookings(updated);
    localStorage.setItem('parkshare_driver_bookings', JSON.stringify(updated));
  };

  const handleCancelSpaBooking = (id: string) => {
    if (!confirm('Are you sure you want to cancel this car spa booking?')) return;
    const updated = spaBookings.map((s) => s.id === id ? { ...s, status: 'CANCELLED' as const } : s);
    setSpaBookings(updated);
    localStorage.setItem('parkshare_spa_bookings', JSON.stringify(updated));
  };

  const handleConfirmReview = async () => {
    if (!reviewBooking) return;
    try {
      setSubmittingReview(true);
      await api.createReview({
        booking_id: reviewBooking.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      alert('Review submitted! Thank you.');
      setReviewBooking(null);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-200 dark:border-emerald-800">Confirmed</span>;
      case 'ACTIVE':
      case 'PARKING_ACTIVE':
        return <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-blue-200 dark:border-blue-800 animate-pulse">Parked Now</span>;
      case 'PENDING_PAYMENT':
        return <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-amber-200 dark:border-amber-800">Payment Due</span>;
      case 'COMPLETED':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Completed</span>;
      case 'CANCELLED':
        return <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-rose-200 dark:border-rose-800">Cancelled</span>;
      default:
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2.5 py-0.5 rounded-full text-[10px]">{status}</span>;
    }
  };

  // Back button handler
  const handleBack = () => {
    if (isParkingOnly) {
      navigate('/parking');
    } else if (isDriversOnly) {
      navigate('/services/drivers');
    } else if (isSpaOnly) {
      navigate('/services/car-spa');
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-6 px-4 max-w-md mx-auto space-y-4 font-sans transition-colors duration-200 pb-24">
      
      {/* 1. Header with Contextual Back Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              {isParkingOnly
                ? 'Parking Passes & History'
                : isDriversOnly
                ? 'Acting Driver Rides'
                : isSpaOnly
                ? 'Car Spa Bookings'
                : 'Bookings & Passes'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isParkingOnly
                ? 'Active gate entry passes & parking history'
                : isDriversOnly
                ? 'Active chauffeurs & trip receipts'
                : isSpaOnly
                ? 'Scheduled wash appointments & receipts'
                : 'Classified by service category'}
            </p>
          </div>
        </div>

        {/* Action Link on Top Right */}
        {isParkingOnly ? (
          <Link
            to="/parking"
            className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
          >
            <span>+ Find Spots</span>
          </Link>
        ) : (
          <Link
            to="/"
            className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
          >
            <span>+ New Booking</span>
          </Link>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SERVICE CLASSIFICATION PILLS (ONLY SHOWN BEFORE SELECTING A SERVICE)    */}
      {/* If accessed from parking page, this whole block is hidden!               */}
      {/* ========================================================================= */}
      {!isServiceLocked && (
        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between px-1 text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
            <span className="flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Service Classification</span>
            </span>
            <span className="text-[10px] text-slate-400">Filter your reservations</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleClassificationChange('ALL')}
              className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition flex flex-col items-center justify-center cursor-pointer ${
                serviceClassification === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span>All</span>
              <span className="text-[9px] opacity-75 mt-0.5">({currentTotal})</span>
            </button>

            <button
              type="button"
              onClick={() => handleClassificationChange('PARKING')}
              className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition flex flex-col items-center justify-center cursor-pointer ${
                serviceClassification === 'PARKING'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span>🅿️ Parking</span>
              <span className="text-[9px] opacity-75 mt-0.5">
                ({activeTab === 'ACTIVE' ? activeParking.length : historyParking.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleClassificationChange('DRIVERS')}
              className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition flex flex-col items-center justify-center cursor-pointer ${
                serviceClassification === 'DRIVERS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span>🧑‍✈️ Drivers</span>
              <span className="text-[9px] opacity-75 mt-0.5">
                ({activeTab === 'ACTIVE' ? activeDrivers.length : historyDrivers.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleClassificationChange('CAR_SPA')}
              className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition flex flex-col items-center justify-center cursor-pointer ${
                serviceClassification === 'CAR_SPA'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span>✨ Car Spa</span>
              <span className="text-[9px] opacity-75 mt-0.5">
                ({activeTab === 'ACTIVE' ? activeSpa.length : historySpa.length})
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Active vs History Switcher */}
      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'ACTIVE'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <span>{isParkingOnly ? 'Active Passes' : 'Active Passes & Trips'}</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500 text-white rounded-full font-bold">
            {totalActive}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <span>{isParkingOnly ? 'Past Parking' : 'History & Receipts'}</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-full font-bold">
            {totalHistory}
          </span>
        </button>
      </div>

      {/* 4. Bookings Content */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/90 dark:border-slate-800">
          <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading reservations...</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* ========================================================= */}
          {/* A. PARKING BOOKINGS (ONLY IF IN PARKING OR ALL)          */}
          {/* ========================================================= */}
          {(serviceClassification === 'ALL' || serviceClassification === 'PARKING') && (
            <>
              {activeTab === 'ACTIVE' && activeParking.length > 0 && (
                <div className="space-y-3">
                  {!isParkingOnly && serviceClassification === 'ALL' && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                        <span>🅿️ Parking Passes</span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full font-bold">
                          {activeParking.length}
                        </span>
                      </span>
                    </div>
                  )}

                  {activeParking.map((b) => {
                    if (b.status === 'PENDING_PAYMENT') {
                      return (
                        <div
                          key={`pkg-${b.id}`}
                          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-300 dark:border-amber-700/60 shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              Ref #{b.booking_reference}
                            </span>
                            {renderStatusBadge(b.status)}
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {b.listing?.title || 'Parking Space'}
                            </h3>
                            <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{b.listing?.approximate_address}</span>
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handlePayPendingBooking(b)}
                              disabled={payingBookingId === b.id}
                              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{payingBookingId === b.id ? 'Connecting...' : `Complete Payment ₹${b.total_amount}`}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenCancelModal(b)}
                              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <ActiveParkingCard
                        key={`pkg-${b.id}`}
                        booking={b}
                        onRefresh={fetchBookings}
                      />
                    );
                  })}
                </div>
              )}

              {activeTab === 'HISTORY' && historyParking.length > 0 && (
                <div className="space-y-3">
                  {!isParkingOnly && serviceClassification === 'ALL' && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                        <span>🅿️ Past Parking</span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                          {historyParking.length}
                        </span>
                      </span>
                    </div>
                  )}

                  {historyParking.map((b) => (
                    <div
                      key={`hist-pkg-${b.id}`}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 hover:shadow-md transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                          Ref #{b.booking_reference}
                        </span>
                        {renderStatusBadge(b.status)}
                      </div>

                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                          {b.listing?.title || 'Parking Space'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{b.listing?.exact_address || b.listing?.approximate_address}</span>
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Time</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                            {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Total Amount</span>
                          <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                            ₹{b.total_amount}
                          </span>
                        </div>
                        {b.vehicle && (
                          <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                              <Car className="w-3 h-3 text-slate-400" />
                              <span>{b.vehicle.vehicle_type}</span>
                            </span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {b.vehicle.registration_number}
                            </span>
                          </div>
                        )}
                      </div>

                      {b.status === 'COMPLETED' && !b.review && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewBooking(b);
                              setReviewRating(5);
                              setReviewComment('');
                            }}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-white" />
                            <span>Rate & Review Host</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* B. ACTING DRIVERS (ONLY IF NOT IN PARKING SERVICE)        */}
          {/* ========================================================= */}
          {!isParkingOnly && (serviceClassification === 'ALL' || serviceClassification === 'DRIVERS') && (
            <>
              {activeTab === 'ACTIVE' && activeDrivers.length > 0 && (
                <div className="space-y-3">
                  {serviceClassification === 'ALL' && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                        <span>🧑‍✈️ Acting Drivers</span>
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full font-bold">
                          {activeDrivers.length}
                        </span>
                      </span>
                    </div>
                  )}

                  {activeDrivers.map((d) => (
                    <div
                      key={d.bookingId}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-indigo-200/80 dark:border-indigo-900/50 shadow-xs space-y-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-extrabold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                          #{d.bookingId}
                        </span>
                        <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-200 dark:border-emerald-800">
                          Chauffeur Confirmed
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black text-lg border border-indigo-200 dark:border-indigo-800">
                            {d.driver?.name?.charAt(0) || 'D'}
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-1">
                              <span>{d.driver?.name}</span>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            </h3>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="flex items-center text-amber-500 font-bold">
                                ★ {d.driver?.rating}
                              </span>
                              <span>• {d.driver?.trips} trips completed</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Total Fare</span>
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            ₹{d.totalFare}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[11px] font-semibold">Trip Type</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 capitalize">
                            {d.tripType} Ride ({d.durationHours} hrs)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[11px] font-semibold">Pickup Spot</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                            {d.pickupLocation}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-bold">Driver Start OTP:</span>
                          <span className="text-sm font-mono font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {d.otp}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <a
                          href={`tel:${d.driver?.phone || '+919876543210'}`}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Chauffeur</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCancelDriverBooking(d.bookingId)}
                          className="py-2 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'HISTORY' && historyDrivers.length > 0 && (
                <div className="space-y-3">
                  {serviceClassification === 'ALL' && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                        <span>🧑‍✈️ Past Driver Trips</span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                          {historyDrivers.length}
                        </span>
                      </span>
                    </div>
                  )}

                  {historyDrivers.map((d) => (
                    <div
                      key={d.bookingId}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">#{d.bookingId}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {d.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {d.driver?.name} • {d.tripType}
                          </h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {d.pickupLocation}
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">₹{d.totalFare}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* C. CAR SPA (ONLY IF NOT IN PARKING SERVICE)               */}
          {/* ========================================================= */}
          {!isParkingOnly && (serviceClassification === 'ALL' || serviceClassification === 'CAR_SPA') && (
            <>
              {activeTab === 'ACTIVE' && activeSpa.length > 0 && (
                <div className="space-y-3">
                  {serviceClassification === 'ALL' && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                        <span>✨ Car Spa Sessions</span>
                        <span className="text-[10px] text-cyan-600 bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded-full font-bold">
                          {activeSpa.length}
                        </span>
                      </span>
                    </div>
                  )}

                  {activeSpa.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-cyan-200/80 dark:border-cyan-900/50 shadow-xs space-y-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-extrabold text-cyan-600 bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded-full">
                          #{s.id}
                        </span>
                        <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-200 dark:border-emerald-800">
                          Spa Slot Confirmed
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {s.packageName}
                          </h3>
                          <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-bold block mt-0.5">
                            {s.vehicleCategory} Treatment
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Total</span>
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            ₹{s.price}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[11px] font-semibold">Scheduled Date & Time</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">
                            {s.date} • {s.timeSlot}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[11px] font-semibold">Service Location</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                            {s.address}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-bold">Service Start PIN:</span>
                          <span className="text-sm font-mono font-black text-cyan-600 bg-cyan-50 dark:bg-cyan-950 px-2.5 py-0.5 rounded-lg border border-cyan-200">
                            {s.otp}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => alert(`Spa crew will arrive at: ${s.address} during ${s.timeSlot}. Support line: 1800-419-7275`)}
                          className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>View Location & Crew</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelSpaBooking(s.id)}
                          className="py-2 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'HISTORY' && historySpa.length > 0 && (
                <div className="space-y-3">
                  {serviceClassification === 'ALL' && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                        <span>✨ Past Spa Treatments</span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                          {historySpa.length}
                        </span>
                      </span>
                    </div>
                  )}

                  {historySpa.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">#{s.id}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {s.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {s.packageName}
                          </h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {s.date} • {s.vehicleCategory}
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">₹{s.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* EMPTY STATE */}
          {((activeTab === 'ACTIVE' && (
            (isParkingOnly && activeParking.length === 0) ||
            (!isParkingOnly && serviceClassification === 'ALL' && totalActive === 0) ||
            (!isParkingOnly && serviceClassification === 'PARKING' && activeParking.length === 0) ||
            (!isParkingOnly && serviceClassification === 'DRIVERS' && activeDrivers.length === 0) ||
            (!isParkingOnly && serviceClassification === 'CAR_SPA' && activeSpa.length === 0)
          )) ||
          (activeTab === 'HISTORY' && (
            (isParkingOnly && historyParking.length === 0) ||
            (!isParkingOnly && serviceClassification === 'ALL' && totalHistory === 0) ||
            (!isParkingOnly && serviceClassification === 'PARKING' && historyParking.length === 0) ||
            (!isParkingOnly && serviceClassification === 'DRIVERS' && historyDrivers.length === 0) ||
            (!isParkingOnly && serviceClassification === 'CAR_SPA' && historySpa.length === 0)
          ))) && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/90 dark:border-slate-800 space-y-3">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {activeTab === 'ACTIVE' ? 'No Active Parking Passes' : 'No Past Parking Sessions'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {activeTab === 'ACTIVE'
                  ? 'Book a spot on the parking radar to receive your instant digital gate pass & PIN.'
                  : 'Completed parking sessions and receipts will appear here.'}
              </p>
              
              <div className="pt-2 flex flex-wrap gap-2 justify-center">
                <Link
                  to="/parking"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition shadow-xs"
                >
                  Find Parking Spots
                </Link>
                {isParkingOnly && (
                  <Link
                    to="/bookings"
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-2xl text-xs transition"
                  >
                    View All Services Bookings
                  </Link>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Helper Link when locked to parking: Option to view all classified bookings */}
      {isParkingOnly && (
        <div className="pt-2 text-center">
          <Link
            to="/bookings"
            className="text-[11px] font-bold text-slate-400 hover:text-emerald-600 transition"
          >
            Switch to All Services Classified Bookings →
          </Link>
        </div>
      )}

      {/* MODAL: Access Pass & PIN Dialog */}
      {accessPassBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-slate-800 dark:text-white" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Gate Access Pass</h3>
              </div>
              <button
                type="button"
                onClick={() => setAccessPassBooking(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code */}
            {accessPassBooking.qr_token && (
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="bg-white p-2 rounded-xl shadow-xs">
                  <QRCodeSVG value={accessPassBooking.qr_token} size={130} />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  Scan at automated parking barrier
                </span>
              </div>
            )}

            {/* Entry PIN Code */}
            {accessPassBooking.verification_code && (
              <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl text-center space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Manual Entry PIN Code
                </span>
                <div className="text-2xl font-mono font-black tracking-widest text-slate-900 dark:text-white">
                  {accessPassBooking.verification_code}
                </div>
              </div>
            )}

            {/* Location & Navigation */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exact Destination</span>
                </span>
                {accessPassBooking.listing?.latitude && accessPassBooking.listing?.longitude && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${accessPassBooking.listing?.latitude},${accessPassBooking.listing?.longitude}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Navigate</span>
                  </button>
                )}
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                {accessPassBooking.listing?.exact_address || accessPassBooking.listing?.approximate_address}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAccessPassBooking(null)}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Cancellation Dialog */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Cancel Reservation</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel booking #{selectedBooking.booking_reference}?
            </p>

            {previewLoading ? (
              <p className="text-xs text-slate-400">Calculating refund...</p>
            ) : preview && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Refund Amount:</span>
                  <span className="font-extrabold text-emerald-600">₹{preview.refund_amount}</span>
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Review Dialog */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Rate Your Experience</h3>
            
            <div className="flex justify-center space-x-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1 cursor-pointer"
                >
                  <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              placeholder="How was the space access, lighting, or host?"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
            />

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                disabled={submittingReview}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 cursor-pointer"
              >
                {submittingReview ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
