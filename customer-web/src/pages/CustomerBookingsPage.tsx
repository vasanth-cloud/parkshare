import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Phone
} from 'lucide-react';
import { ActiveParkingCard } from '../components/ActiveParkingCard';

export const CustomerBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  // Report Problem Modal
  const [reportBooking, setReportBooking] = useState<Booking | null>(null);
  const [reportCategory, setReportCategory] = useState<string>('SPACE_UNAVAILABLE');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);

  // Leave Review Modal
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchBookings = () => {
    setLoading(true);
    api.getMyBookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Filter Active vs History
  const activeBookings = bookings.filter((b) =>
    ['CONFIRMED', 'PENDING_PAYMENT', 'ACTIVE', 'PARKING_ACTIVE', 'KEY_RECEIVED', 'KEY_HANDOVER_PENDING', 'DRIVER_ARRIVED', 'ODOMETER_PHOTO_SUBMITTED', 'VEHICLE_COLLECTION_REQUESTED', 'BOOKING_CREATED'].includes(b.status)
  );

  const historyBookings = bookings.filter((b) =>
    ['COMPLETED', 'CANCELLED', 'EXPIRED', 'VEHICLE_RELEASED', 'REJECTED'].includes(b.status)
  );

  const currentList = activeTab === 'ACTIVE' ? activeBookings : historyBookings;

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

  const handleConfirmReport = async () => {
    if (!reportBooking || !reportDescription.trim()) {
      alert('Please enter a description');
      return;
    }
    try {
      setSubmittingReport(true);
      await api.createDispute({
        booking_id: reportBooking.id,
        category: reportCategory,
        description: reportDescription,
      });
      alert('Problem reported to ParkShare support.');
      setReportBooking(null);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
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

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-6 px-4 max-w-md mx-auto space-y-4 font-sans transition-colors duration-200">
      
      {/* 1. Page Header with Back Action */}
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
          <h1 className="text-xl font-black text-slate-900 dark:text-white">My Reservations</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">View active parking passes & history</p>
        </div>
      </div>

      {/* 2. Clean Segmented Tab Switcher */}
      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'ACTIVE'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <span>Active Passes</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-full">
            {activeBookings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'HISTORY'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <span>History</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-full">
            {historyBookings.length}
          </span>
        </button>
      </div>

      {/* 3. Bookings List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/90 dark:border-slate-800">
          <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading your reservations...</p>
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/90 dark:border-slate-800 space-y-3">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            {activeTab === 'ACTIVE' ? 'No Active Parking Passes' : 'No Past Reservations'}
          </h3>
          <p className="text-xs text-slate-400">
            {activeTab === 'ACTIVE' ? 'Book a spot to get instant gate entry QR & PIN.' : 'Your finished parking sessions will appear here.'}
          </p>
          {activeTab === 'ACTIVE' && (
            <Link
              to="/"
              className="inline-block bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold px-4 py-2 rounded-2xl text-xs transition"
            >
              Find Parking Spots
            </Link>
          )}
        </div>
      ) : activeTab === 'ACTIVE' ? (
        <div className="space-y-4">
          {activeBookings.map((b) => {
            if (b.status === 'PENDING_PAYMENT') {
              return (
                <div
                  key={b.id}
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
                key={b.id}
                booking={b}
                onRefresh={fetchBookings}
              />
            );
          })}
        </div>
      ) : (
        /* History tab rendering */
        <div className="space-y-3">
          {historyBookings.map((b) => (
            <div
              key={b.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 hover:shadow-md transition"
            >
              {/* Top row: Status & Ref */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  Ref #{b.booking_reference}
                </span>
                {renderStatusBadge(b.status)}
              </div>

              {/* Title & Location */}
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                  {b.listing?.title || 'Parking Space'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{b.listing?.exact_address || b.listing?.approximate_address}</span>
                </p>
              </div>

              {/* Compact Details Grid */}
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

              {/* Action Buttons for History */}
              <div className="flex items-center space-x-2 pt-1">
                {b.status === 'COMPLETED' && !b.review && (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewBooking(b);
                      setReviewRating(5);
                      setReviewComment('');
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span>Rate & Review Host</span>
                  </button>
                )}
                {b.review && (
                  <div className="flex-1 text-center py-1.5 text-xs text-amber-500 font-bold flex items-center justify-center space-x-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>Rated {b.review.rating} / 5</span>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL: Access Pass & PIN Dialog (Keeps main page clean!) */}
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
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
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

            {/* Entry PIN / Verification Code */}
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

            {/* Unlocked Exact Address & Navigation */}
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
                    className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Navigate</span>
                  </button>
                )}
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                {accessPassBooking.listing?.exact_address || accessPassBooking.listing?.approximate_address}
              </p>
            </div>

            {/* Unlocked Host Contact */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Host Contact</span>
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  {accessPassBooking.host_name || 'Verified Host'}
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-300 text-xs">
                  {accessPassBooking.host_phone || '+91 98765 43210'}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <a
                  href={`tel:${accessPassBooking.host_phone || '+919876543210'}`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1 shadow-xs"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${(accessPassBooking.host_phone || '+919876543210').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1 shadow-xs"
                >
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Instructions */}
            {accessPassBooking.listing?.access_instructions && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <strong>Host Instructions:</strong> {accessPassBooking.listing.access_instructions}
              </p>
            )}

            <button
              type="button"
              onClick={() => setAccessPassBooking(null)}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-2.5 rounded-xl text-xs transition"
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
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
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
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Rate Your Parking Experience</h3>
            
            <div className="flex justify-center space-x-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1"
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
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                disabled={submittingReview}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900"
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
