import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Booking, CancellationPreview } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Key,
  CheckCircle,
  Car,
  CreditCard,
  XCircle,
  Star,
  X,
  Navigation,
  Check,
  ShieldCheck
} from 'lucide-react';
import { ActiveParkingCard } from '../components/ActiveParkingCard';
import { GooglePaySuccessCelebration, CelebrationData } from '../components/GooglePaySuccessCelebration';

const PRESET_REVIEW_TAGS = [
  'Safe & Secure',
  'Easy Gate Access',
  'Helpful Host',
  'Spacious Spot',
  'Well Lit & Clean',
  'Smooth Checkout',
  'Accurate Location',
  '24/7 Security'
];

export const CustomerBookingsPage: React.FC = () => {
  const navigate = useNavigate();

  const [parkingBookings, setParkingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  // Modal States
  const [accessPassBooking, setAccessPassBooking] = useState<Booking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  // Post-Trip Rate & Review Modal State
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Safe & Secure','Easy Gate Access']);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);

  // Google Pay Style Finished Celebration State
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);

  const fetchBookings = (silent = false) => {
    if (!silent) setLoading(true);
    api.getMyBookings()
      .then((data) => {
        const freshList = data || [];
        setParkingBookings((prev) => {
          // Detect if any booking transitioned from pending arrival to PARKING_ACTIVE!
          freshList.forEach((newB) => {
            const oldB = prev.find((o) => o.id === newB.id);
            if (oldB) {
              const justBecameActive =
                (oldB.status === 'CONFIRMED' || oldB.status === 'DRIVER_ARRIVED' || oldB.status === 'BOOKING_CREATED') &&
                (newB.status === 'PARKING_ACTIVE' || newB.status === 'ACTIVE');

              if (justBecameActive) {
                setCelebrationData({
                  title: 'Gate Access Verified!',
                  subtitle: 'Vehicle safely checked in. Enjoy your parking session!',
                  reference: newB.booking_reference,
                  spot: newB.listing?.title,
                  bay: newB.space_number || 'A01',
                });
              }
            }
          });
          return freshList;
        });
      })
      .catch(console.error)
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    fetchBookings(false);
    // Silent auto-refresh polling every 2.5s so driver screen updates live without manual reload
    const interval = setInterval(() => {
      fetchBookings(true);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Filter Parking Active vs History
  const activeParking = parkingBookings.filter((b) =>
    ['CONFIRMED', 'PENDING_PAYMENT', 'ACTIVE', 'PARKING_ACTIVE', 'KEY_RECEIVED', 'KEY_HANDOVER_PENDING', 'DRIVER_ARRIVED', 'ODOMETER_PHOTO_SUBMITTED', 'VEHICLE_COLLECTION_REQUESTED', 'BOOKING_CREATED'].includes(b.status)
  );

  const historyParking = parkingBookings.filter((b) =>
    ['COMPLETED', 'CANCELLED', 'EXPIRED', 'VEHICLE_RELEASED', 'REJECTED'].includes(b.status)
  );

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
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'ParkCo Parking',
        description: `Reserve spot at ${b.listing?.title || 'Parking Space'}`,
        order_id: orderData.order_id,
        prefill: {
          name: 'Parker Guest',
        },
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

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleConfirmReview = async () => {
    if (!reviewBooking) return;
    try {
      setSubmittingReview(true);
      let finalComment = '';
      if (selectedTags.length > 0 && reviewComment.trim()) {
        finalComment = `[${selectedTags.join(', ')}] — ${reviewComment.trim()}`;
      } else if (selectedTags.length > 0) {
        finalComment = selectedTags.join(', ');
      } else if (reviewComment.trim()) {
        finalComment = reviewComment.trim();
      }

      await api.createReview({
        booking_id: reviewBooking.id,
        rating: reviewRating,
        comment: finalComment || undefined,
      });
      alert('Review submitted successfully! It is now visible on the parking space page.');
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
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-6 px-4 max-w-md mx-auto space-y-4 font-sans transition-colors duration-200 pb-24">
      
      {/* 1. Header with Contextual Back Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              Bookings & Passes
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
            </p>
          </div>
        </div>

        {/* Action Link on Top Right */}
        <div className="flex flex-col items-end gap-0.5">
          <Link
            to="/"
            className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
          >
            <span>+ Find Spots</span>
          </Link>
          <Link
            to="/drivers/trips"
            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Acting driver trips
          </Link>
        </div>
      </div>

      {/* 2. Active vs History Switcher */}
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
          <span>Active Passes</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500 text-white rounded-full font-bold">
            {activeParking.length}
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
          <span>History & Receipts</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-full font-bold">
            {historyParking.length}
          </span>
        </button>
      </div>

      {/* 3. Bookings Content */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/90 dark:border-slate-800">
          <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading reservations...</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* A. ACTIVE PARKING PASSES */}
          {activeTab === 'ACTIVE' && (
            <>
              {activeParking.length > 0 ? (
                <div className="space-y-3">
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
                        onRefresh={() => fetchBookings(false)}
                        onTripCompleted={(completedBooking) => {
                          setCelebrationData({
                            title: 'Trip Completed Successfully!',
                            subtitle: 'Checkout verified. Thank you for parking with ParkCo!',
                            reference: completedBooking.booking_reference,
                            spot: completedBooking.listing?.title,
                            bay: completedBooking.space_number || 'A01',
                          });
                          setReviewBooking(completedBooking);
                          setReviewRating(5);
                          setSelectedTags(['Safe & Secure','Easy Gate Access']);
                          setReviewComment('');
                          fetchBookings(false);
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/90 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                    
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    No Active Parking Passes
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Search driveway spots near your destination with live GPS radar to reserve your space.
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition shadow-xs inline-block"
                    >
                      Find Parking Spots
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}

          {/* B. HISTORY & RECEIPTS */}
          {activeTab === 'HISTORY' && (
            <>
              {historyParking.length > 0 ? (
                <div className="space-y-3">
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
                              setSelectedTags(['Safe & Secure','Easy Gate Access']);
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
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/90 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                    
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    No Past Bookings
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  </p>
                </div>
              )}
            </>
          )}

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

      {/* ========================================================================= */}
      {/* MODAL: POST-TRIP RATE & REVIEW DIALOG                                      */}
      {/* Allows quick-tap tags without having to type                               */}
      {/* ========================================================================= */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Rate Your Experience</h3>
                  <p className="text-[10px] text-slate-400">
                    {reviewBooking.listing?.title || 'Parking Space'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Interactive Star Rating */}
            <div className="text-center py-1">
              <div className="flex justify-center space-x-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 cursor-pointer transition transform hover:scale-110 active:scale-95"
                  >
                    <Star className={`w-7 h-7 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-extrabold text-amber-500">
                {reviewRating === 5 && 'Outstanding Experience!'}
                {reviewRating === 4 &&'Very Good Space'}
                {reviewRating === 3 &&'Good Parking'}
                {reviewRating === 2 &&'Could Be Better'}
                {reviewRating === 1 &&'Poor Experience'}
              </span>
            </div>

            {/* Quick-tap Tag Badges */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Quick Options (Tap to add):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REVIEW_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition flex items-center space-x-1 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white inline flex-shrink-0" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Additional Comments */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 block">
                Additional Comments (Optional):
              </span>
              <textarea
                rows={2}
                placeholder="Write any thoughts or leave blank..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
              >
                Skip for Now
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                disabled={submittingReview}
                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition cursor-pointer"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Pay Style Success Celebration Modal */}
      {celebrationData && (
        <GooglePaySuccessCelebration
          data={celebrationData}
          onDismiss={() => setCelebrationData(null)}
        />
      )}
    </div>
  );
};
