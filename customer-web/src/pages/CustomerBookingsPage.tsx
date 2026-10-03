import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Booking, CancellationPreview } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, MapPin, Clock, Lock, CheckCircle, Car, Shield, AlertCircle, XCircle, Star, CreditCard } from 'lucide-react';

import { ActiveParkingCard } from '../components/ActiveParkingCard';

export const CustomerBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Cancellation Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  // Dispute / Report Problem Modal State
  const [reportBooking, setReportBooking] = useState<Booking | null>(null);
  const [reportCategory, setReportCategory] = useState<string>('SPACE_UNAVAILABLE');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);

  // Leave a Review Modal State (Allowed ONLY for COMPLETED bookings)
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const handleOpenReviewModal = (b: Booking) => {
    setReviewBooking(b);
    setReviewRating(5);
    setReviewComment('');
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
      alert('Thank you! Your rating & review have been submitted.');
      setReviewBooking(null);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenReportModal = (b: Booking) => {
    setReportBooking(b);
    setReportCategory('SPACE_UNAVAILABLE');
    setReportDescription('');
  };

  const handleConfirmReport = async () => {
    if (!reportBooking || !reportDescription.trim()) {
      alert('Please enter a detailed description of the issue.');
      return;
    }
    try {
      setSubmittingReport(true);
      await api.createDispute({
        booking_id: reportBooking.id,
        category: reportCategory,
        description: reportDescription,
      });
      alert('Your problem report has been submitted to ParkShare Admin for investigation.');
      setReportBooking(null);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };


  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);

  const fetchBookings = () => {
    setLoading(true);
    api.getMyBookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handlePayPendingBooking = async (b: Booking) => {
    try {
      setPayingBookingId(b.id);
      const orderData = await api.createPaymentOrder(b.id);

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        alert('Razorpay Checkout SDK not loaded. Please refresh the page and try again.');
        setPayingBookingId(null);
        return;
      }

      const options = {
        key: orderData.key_id || 'rzp_test_TjLLsOAid1sNkb',
        amount: orderData.amount_in_paise || Math.round((orderData.amount || b.total_amount) * 100),
        currency: orderData.currency || 'INR',
        name: 'ParkShare Parking',
        description: `Booking #${b.booking_reference} - ${b.listing?.title || 'Parking Space'}`,
        order_id: orderData.order_id,
        theme: {
          color: '#059669',
        },
        modal: {
          ondismiss: () => {
            setPayingBookingId(null);
          },
        },
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
      rzp.on('payment.failed', (failRes: any) => {
        setPayingBookingId(null);
        alert(`Payment failed: ${failRes?.error?.description || 'Transaction declined'}`);
      });
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Failed to start payment');
      setPayingBookingId(null);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(() => {
      api.getMyBookings().then(setBookings).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeBooking =
    bookings.find((b) =>
      [
        'VEHICLE_COLLECTION_REQUESTED',
        'PARKING_ACTIVE',
        'ACTIVE',
        'KEY_RECEIVED',
        'KEY_HANDOVER_PENDING',
        'ODOMETER_PHOTO_SUBMITTED',
        'DRIVER_ARRIVED',
      ].includes(b.status)
    ) || bookings.find((b) => ['CONFIRMED', 'BOOKING_CREATED'].includes(b.status));

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

  const renderStatusBadge = (b: Booking) => {
    switch (b.status) {
      case 'DRIVER_ARRIVED':
        return <span className="bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-full text-xs animate-pulse">Driver Arrived</span>;
      case 'ODOMETER_PHOTO_SUBMITTED':
      case 'KEY_HANDOVER_PENDING':
        return <span className="bg-purple-600 text-white font-bold px-3 py-1 rounded-full text-xs animate-pulse">Key Handover Pending</span>;
      case 'KEY_RECEIVED':
      case 'PARKING_ACTIVE':
      case 'ACTIVE':
        return <span className="bg-emerald-600 text-white font-bold px-3 py-1 rounded-full text-xs">Parking Active</span>;
      case 'VEHICLE_COLLECTION_REQUESTED':
        return <span className="bg-amber-600 text-white font-black px-3 py-1 rounded-full text-xs animate-pulse">Collection Requested</span>;
      case 'RELEASE_OTP_VERIFIED':
      case 'VEHICLE_RELEASED':
      case 'COMPLETED':
        return <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-full text-xs">Completed</span>;
      case 'CONFIRMED':
        return <span className="bg-emerald-600 text-white font-bold px-3 py-1 rounded-full text-xs">Confirmed</span>;
      case 'PENDING_PAYMENT': {
        const exp = b.payment_expires_at ? new Date(b.payment_expires_at).getTime() : 0;
        const sec = Math.max(0, Math.floor((exp - nowTime) / 1000));
        if (exp > 0 && sec <= 0) {
          return <span className="bg-gray-100 text-gray-500 border border-gray-300 font-bold px-3 py-1 rounded-full text-xs">Session Timed Out</span>;
        }
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1 rounded-full text-xs animate-pulse flex items-center space-x-1">
            <span>⏱️ 1-Min Hold ({sec > 0 ? `00:${('0' + sec).slice(-2)}` : 'Active'})</span>
          </span>
        );
      }
      case 'EXPIRED':
        return <span className="bg-gray-100 text-gray-500 border border-gray-300 font-bold px-3 py-1 rounded-full text-xs">Session Timed Out</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-700 font-bold px-3 py-1 rounded-full text-xs">Cancelled</span>;
      case 'DISPUTE_OPENED':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1 rounded-full text-xs">Dispute Opened</span>;
      default:
        return <span className="bg-gray-200 text-gray-700 font-bold px-3 py-1 rounded-full text-xs">{b.status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center space-x-2">
          <Calendar className="w-7 h-7 text-emerald-600" />
          <span>My Reservations & Access Pass</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">Manage your active parking passes, entry PINs, and booking history</p>
      </div>

      {activeBooking && <ActiveParkingCard booking={activeBooking} onRefresh={fetchBookings} />}


      {loading ? (
        <div className="text-center py-16 text-gray-500 text-sm">Loading your reservations...</div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 space-y-3">
          <Car className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900">No Reservations Found</h3>
          <p className="text-sm text-gray-500">You haven't reserved any parking space yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
            >
              {/* Left Column: Details */}
              <div className="md:col-span-8 space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                    Ref: #{b.booking_reference}
                  </span>
                  {renderStatusBadge(b)}

                  {b.cancellation_tier && (
                    <span className="text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full">
                      Refund: ₹{b.refund_amount} ({b.cancellation_tier.replace('_', ' ')})
                    </span>
                  )}
                </div>

                {b.cancelled_by === 'HOST' && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-950 font-medium space-y-1">
                    <span className="font-extrabold text-rose-900 block flex items-center space-x-1">
                      <span>⚠️ Reservation Cancelled by Space Host</span>
                    </span>
                    <p className="text-rose-800 text-[11px]">
                      The parking host cancelled this booking. An automatic <strong>100% Full Refund of ₹{(b.refund_amount || 0).toFixed(2)}</strong> has been processed to your original payment method.
                    </p>
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900">{b.listing?.title || 'Parking Space'}</h3>

                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5 text-emerald-900">
                      <MapPin className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <span>Unlocked Exact Parking Location</span>
                    </span>
                    {b.listing?.latitude && (
                      <button
                        type="button"
                        onClick={() => {
                          const destLat = b.listing!.latitude;
                          const destLng = b.listing!.longitude;
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                window.open(`https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${destLat},${destLng}`, '_blank', 'noopener,noreferrer');
                              },
                              () => {
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, '_blank', 'noopener,noreferrer');
                              },
                              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                            );
                          } else {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center space-x-1"
                      >
                        <span>Navigate in Google Maps 🗺️</span>
                      </button>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900">{b.listing?.exact_address || b.listing?.approximate_address}</p>
                  {b.listing?.access_instructions && (
                    <p className="text-[11px] text-emerald-800 pt-0.5">
                      <strong>Host Entry Instructions:</strong> {b.listing.access_instructions}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Start Time</span>
                      <span className="font-semibold">{new Date(b.start_time).toLocaleString()}</span>
                    </div>
                    <div className="border-l border-gray-300 pl-4">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">End Time</span>
                      <span className="font-semibold">{new Date(b.end_time).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {b.status === 'PENDING_PAYMENT' && (() => {
                      const exp = b.payment_expires_at ? new Date(b.payment_expires_at).getTime() : 0;
                      const sec = Math.max(0, Math.floor((exp - nowTime) / 1000));
                      if (exp > 0 && sec <= 0) {
                        return (
                          <Link
                            to={`/listing/${b.listing_id}`}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline px-2 py-1 flex items-center space-x-1"
                          >
                            <span>Hold Expired - Re-book Space →</span>
                          </Link>
                        );
                      }
                      return (
                        <button
                          onClick={() => handlePayPendingBooking(b)}
                          disabled={payingBookingId === b.id}
                          className="text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{payingBookingId === b.id ? 'Opening Razorpay...' : `Pay Now (₹${b.total_amount}${sec > 0 ? ` - 00:${('0' + sec).slice(-2)}` : ''})`}</span>
                        </button>
                      );
                    })()}

                    {['CONFIRMED', 'PENDING_PAYMENT', 'PENDING_APPROVAL'].includes(b.status) && (
                      <button
                        onClick={() => handleOpenCancelModal(b)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl transition flex items-center space-x-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancel Booking</span>
                      </button>
                    )}

                    {b.status === 'COMPLETED' && (
                      b.review ? (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span>Reviewed ({b.review.rating}/5 ⭐)</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenReviewModal(b)}
                          className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-xl transition flex items-center space-x-1 shadow-xs"
                        >
                          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          <span>Leave a Review</span>
                        </button>
                      )
                    )}

                    <button
                      onClick={() => handleOpenReportModal(b)}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl transition flex items-center space-x-1"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Report Problem</span>
                    </button>
                  </div>
                </div>


                {b.vehicle && (
                  <div className="text-xs text-gray-600 flex items-center space-x-2">
                    <Car className="w-4 h-4 text-emerald-600" />
                    <span>
                      Vehicle: <strong>{b.vehicle.registration_number}</strong> ({b.vehicle.vehicle_type})
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column: Unified Access Pass (Primary QR + Backup PIN) */}
              <div className="md:col-span-4 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center space-y-3">
                <div className="flex items-center justify-center space-x-1 font-bold text-xs uppercase tracking-wider text-emerald-950">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Gate Entry Access Pass</span>
                </div>

                {/* Primary: QR Code Token */}
                {b.qr_token && (
                  <div className="space-y-1">
                    <div className="flex justify-center">
                      <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-emerald-300">
                        <QRCodeSVG value={b.qr_token} size={96} />
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-900 font-semibold block">
                      Primary: Scan QR Pass at Gate
                    </span>
                  </div>
                )}

                {/* Backup: 4-Digit PIN Code */}
                {b.verification_code && (
                  <div className="bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-inner">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Backup 4-Digit PIN Code</span>
                    <span className="text-2xl font-extrabold tracking-widest text-emerald-950 font-mono">
                      {b.verification_code}
                    </span>
                  </div>
                )}

                <p className="text-[10px] text-emerald-800 leading-tight">
                  QR Token contains a secure encrypted reference token (zero personal data). Use 4-digit PIN if host scanner is unavailable.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-gray-200 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>Cancel Reservation</span>
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {previewLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">Calculating refund policy...</div>
            ) : preview ? (
              <div className="space-y-4 text-xs">
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2 text-rose-950">
                  <div className="font-extrabold text-sm flex items-center justify-between text-rose-900">
                    <span>Policy Tier: {preview.cancellation_tier.replace('_', ' ')}</span>
                    <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full text-xs font-mono">
                      {preview.refund_percentage}% Refund
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 font-medium">{preview.policy_description}</p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-3.5 space-y-1.5 border border-gray-200 text-gray-700">
                  <div className="flex justify-between">
                    <span>Total Amount Paid:</span>
                    <span className="font-bold">₹{preview.total_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancellation Fee:</span>
                    <span className="font-bold text-rose-600">-₹{preview.cancellation_fee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-1.5 flex justify-between text-sm font-extrabold text-emerald-800">
                    <span>Refund Amount:</span>
                    <span>₹{preview.refund_amount.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Reason for cancellation (Optional)</label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Plans changed / booked another spot"
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                  >
                    {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-rose-600">Failed to load policy calculation preview.</div>
            )}
          </div>
        </div>
      )}

      {/* Customer Report Problem Modal */}
      {reportBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-gray-200 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Report a Problem with Booking</span>
              </h3>
              <button
                onClick={() => setReportBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-gray-600">
                Filing a problem report alerts ParkShare Admins for investigation and resolution.
              </p>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5 uppercase text-[11px] tracking-wider">Select Issue Category</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {[
                    { id: 'SPACE_UNAVAILABLE', label: 'Space unavailable' },
                    { id: 'HOST_NO_ACCESS', label: "Host didn't provide access" },
                    { id: 'SPACE_OCCUPIED', label: 'Space was occupied' },
                    { id: 'WRONG_LOCATION', label: 'Wrong location / directions' },
                    { id: 'UNSAFE_LISTING', label: 'Unsafe / incorrect listing details' },
                    { id: 'PAYMENT_PROBLEM', label: 'Payment problem / billing error' },
                    { id: 'CUSTOMER_OTHER', label: 'Other issue' },
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
                        name="reportCategory"
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
                <label className="block text-gray-700 font-bold mb-1 uppercase text-[11px] tracking-wider">Describe What Happened</label>
                <textarea
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide specific details so Admin can investigate and process refunds or host action..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setReportBooking(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReport}
                  disabled={submittingReport}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow-sm"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Leave a Review Modal (COMPLETED bookings only) */}
      {reviewBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-gray-200 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center space-x-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                <span>Rate & Review Your Parking Session</span>
              </h3>
              <button
                onClick={() => setReviewBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900 font-medium">
                Parking completed for <strong className="text-amber-950">{reviewBooking.listing?.title || 'Parking Space'}</strong>. How was your experience?
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2 uppercase text-[11px] tracking-wider text-center">
                  Select Rating (1 - 5 Stars)
                </label>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1.5 focus:outline-none transition transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= reviewRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300 fill-gray-100'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 uppercase text-[11px] tracking-wider">
                  Review Comment (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about gate access, space accuracy, or host communication..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setReviewBooking(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReview}
                  disabled={submittingReview}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow-sm disabled:opacity-50"
                >
                  {submittingReview ? 'Publishing...' : 'Publish Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

