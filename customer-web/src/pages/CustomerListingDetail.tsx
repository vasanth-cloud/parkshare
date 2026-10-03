import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ParkingListing, Vehicle, Booking } from '../types';
import { MapPin, Shield, Zap, Car, Clock, Star, Calendar, CreditCard, Lock, CheckCircle, Camera, ShieldCheck, ZoomIn, X, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';

export const CustomerListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState<ParkingListing | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [inspectImage, setInspectImage] = useState<string | null>(null);

  const getAngleInfo = (caption?: string) => {
    const c = (caption || '').toUpperCase();
    if (c.includes('ENTRANCE') || c.includes('ROAD')) {
      return { icon: '🛣️', label: 'Entrance from Road', badge: 'bg-blue-900/80 text-blue-200 border-blue-700' };
    }
    if (c.includes('SLOT') || c.includes('PARKING')) {
      return { icon: '🅿️', label: 'Actual Parking Slot', badge: 'bg-emerald-900/80 text-emerald-200 border-emerald-700' };
    }
    if (c.includes('SURROUNDING') || c.includes('WIDE') || c.includes('ACCESS')) {
      return { icon: '🌐', label: 'Surroundings & Access', badge: 'bg-purple-900/80 text-purple-200 border-purple-700' };
    }
    if (c.includes('ROOF') || c.includes('CLEARANCE') || c.includes('HEIGHT')) {
      return { icon: '📏', label: 'Roof Clearance', badge: 'bg-amber-900/80 text-amber-200 border-amber-700' };
    }
    if (c.includes('GATE') || c.includes('BARRIER')) {
      return { icon: '🚪', label: 'Gate / Entry Area', badge: 'bg-cyan-900/80 text-cyan-200 border-cyan-700' };
    }
    return { icon: '📷', label: caption || 'Space View', badge: 'bg-slate-900/80 text-slate-200 border-slate-700' };
  };

  // Time window selection
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePendingBooking, setActivePendingBooking] = useState<Booking | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // 1-second interval to tick countdown timers
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check on mount if user already has an active 1-minute checkout session for this space
  useEffect(() => {
    if (user && listing) {
      api.getMyBookings()
        .then((bList) => {
          const now = Date.now();
          const active = bList.find(
            (b) =>
              b.listing_id === listing.id &&
              b.status === 'PENDING_PAYMENT' &&
              b.payment_expires_at &&
              new Date(b.payment_expires_at).getTime() > now
          );
          if (active) {
            setActivePendingBooking(active);
          }
        })
        .catch(console.error);
    }
  }, [user, listing]);

  useEffect(() => {
    if (id) {
      api.getListingDetail(parseInt(id)).then(setListing).catch(console.error);
    }
    if (user) {
      api.getVehicles().then((vList) => {
        setVehicles(vList);
        if (vList.length > 0) {
          const defaultV = vList.find((v) => v.is_default) || vList[0];
          setSelectedVehicleId(defaultV.id);
        }
      });
    }
  }, [id, user]);

  const [selectedPlan, setSelectedPlan] = useState<'HOURLY' | 'DAILY' | 'MULTI_DAY' | 'MONTHLY_FULL' | 'MONTHLY_COMMUTER'>('HOURLY');

  // Clear any existing error banner when inputs change
  useEffect(() => {
    setError('');
  }, [startTime, endTime, selectedPlan, selectedVehicleId]);

  // Recalculate price on time or plan change
  useEffect(() => {
    if (listing && startTime && endTime) {
      setLoadingPrice(true);
      api.calculatePrice(listing.id, new Date(startTime).toISOString(), new Date(endTime).toISOString(), selectedPlan)
        .then(setPriceBreakdown)
        .catch(() => setPriceBreakdown(null))
        .finally(() => setLoadingPrice(false));
    }
  }, [listing, startTime, endTime, selectedPlan]);

  const resumePayment = async (b: Booking) => {
    if (!user) return;
    setError('');
    setBookingLoading(true);

    try {
      const orderData = await api.createPaymentOrder(b.id);
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        throw new Error('Razorpay Checkout SDK not loaded. Please refresh the page and try again.');
      }

      const options = {
        key: orderData.key_id || 'rzp_test_TjLLsOAid1sNkb',
        amount: orderData.amount_in_paise || Math.round((orderData.amount || b.total_amount) * 100),
        currency: orderData.currency || 'INR',
        name: 'ParkShare Parking',
        description: `Booking #${b.booking_reference} - ${listing!.title}`,
        order_id: orderData.order_id,
        prefill: {
          name: user.full_name || 'Customer',
          email: user.email || '',
          contact: user.phone_number || '',
        },
        theme: {
          color: '#059669',
        },
        modal: {
          ondismiss: () => {
            setBookingLoading(false);
          },
        },
        handler: async (response: any) => {
          try {
            setBookingLoading(true);
            await api.verifyPayment({
              booking_id: b.id,
              order_id: response.razorpay_order_id || orderData.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            navigate('/bookings');
          } catch (verifyErr: any) {
            setError(verifyErr.message || 'Payment verification failed.');
          } finally {
            setBookingLoading(false);
          }
        },
      };

      const rzpInstance = new Razorpay(options);
      rzpInstance.on('payment.failed', (failRes: any) => {
        setBookingLoading(false);
        setError(`Payment failed: ${failRes?.error?.description || 'Transaction declined'}`);
      });
      rzpInstance.open();
    } catch (err: any) {
      setError(err.message || 'Failed to resume payment session.');
      setBookingLoading(false);
    }
  };

  const handleReserveAndPay = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!selectedVehicleId) {
      setError('Please add or select a vehicle to proceed.');
      return;
    }

    setError('');
    setBookingLoading(true);

    try {
      // 1. Create booking with product plan type (status starts as PENDING_PAYMENT)
      const newBooking: Booking = await api.createBooking({
        listing_id: listing!.id,
        vehicle_id: selectedVehicleId,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        booking_product_type: selectedPlan,
      });

      // Track active 1-minute checkout session
      setActivePendingBooking(newBooking);

      // 2. Create Razorpay Payment order
      const orderData = await api.createPaymentOrder(newBooking.id);

      // Check for Razorpay SDK
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        throw new Error('Razorpay Checkout SDK not loaded. Please refresh the page and try again.');
      }

      // 3. Open genuine Razorpay checkout modal
      const options = {
        key: orderData.key_id || 'rzp_test_TjLLsOAid1sNkb',
        amount: orderData.amount_in_paise || Math.round((orderData.amount || newBooking.total_amount) * 100),
        currency: orderData.currency || 'INR',
        name: 'ParkShare Parking',
        description: `Booking #${newBooking.booking_reference} - ${listing!.title}`,
        order_id: orderData.order_id,
        prefill: {
          name: user.full_name || 'Customer',
          email: user.email || '',
          contact: user.phone_number || '',
        },
        theme: {
          color: '#059669', // Emerald-600
        },
        modal: {
          ondismiss: () => {
            setBookingLoading(false);
            setError('Checkout closed. Your 1-minute reservation hold is active — you can complete payment below before the timer expires.');
          },
        },
        handler: async (response: any) => {
          try {
            setBookingLoading(true);
            // 4. Verify Payment with backend signature check. ONLY ON SUCCESS STATUS BECOMES CONFIRMED!
            await api.verifyPayment({
              booking_id: newBooking.id,
              order_id: response.razorpay_order_id || orderData.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            // 5. Navigate to My Bookings where confirmed pass and parking card are shown
            navigate('/bookings');
          } catch (verifyErr: any) {
            setError(verifyErr.message || 'Payment verification failed. Please contact support.');
          } finally {
            setBookingLoading(false);
          }
        },
      };

      const rzpInstance = new Razorpay(options);
      rzpInstance.on('payment.failed', (failRes: any) => {
        setBookingLoading(false);
        setError(`Payment failed: ${failRes?.error?.description || 'Transaction declined'}`);
      });
      rzpInstance.open();
    } catch (err: any) {
      setError(err.message || 'Failed to complete reservation.');
      setBookingLoading(false);
    }
  };

  if (!listing) {
    return <div className="text-center py-20 text-gray-500">Loading parking space details...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Listing Info */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 overflow-hidden">
            {/* Interactive Multi-Angle Photo Gallery */}
            {(() => {
              const imagesList = (listing.images && listing.images.length > 0)
                ? listing.images
                : [{ image_url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80', caption: 'PARKING_SLOT' }];
              const currentPhoto = imagesList[activePhotoIdx] || imagesList[0];
              const angle = getAngleInfo(currentPhoto.caption);

              return (
                <div className="space-y-2">
                  {/* Main Display Stage */}
                  <div className="relative w-full h-72 sm:h-80 bg-black group overflow-hidden">
                    <img
                      src={currentPhoto.image_url}
                      alt={currentPhoto.caption || listing.title}
                      className="w-full h-full object-cover transition duration-300"
                    />

                    {/* Gradient & Overlay Badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-4 flex flex-col justify-between pointer-events-none">
                      <div className="flex justify-between items-start">
                        {/* Verified Live Camera Badge */}
                        <span className="text-[11px] font-bold bg-emerald-600/90 text-white px-3 py-1 rounded-full shadow-md flex items-center space-x-1.5 backdrop-blur-sm pointer-events-auto">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified On-Site Live Photos</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setInspectImage(currentPhoto.image_url)}
                          className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl transition pointer-events-auto shadow"
                          title="Zoom Photo"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bottom Angle Name & Carousel Arrows */}
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center space-x-1.5 text-xs font-black px-3 py-1 rounded-xl border ${angle.badge} shadow-md backdrop-blur-sm`}>
                            <span className="text-sm">{angle.icon}</span>
                            <span>{angle.label}</span>
                          </span>
                          <p className="text-[11px] text-slate-300 font-medium">
                            Angle {activePhotoIdx + 1} of {imagesList.length}
                          </p>
                        </div>

                        {/* Prev / Next controls */}
                        {imagesList.length > 1 && (
                          <div className="flex items-center space-x-2 pointer-events-auto">
                            <button
                              type="button"
                              onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : imagesList.length - 1))}
                              className="p-2 bg-black/60 hover:bg-black/90 text-white rounded-xl transition shadow"
                              title="Previous Photo"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePhotoIdx((prev) => (prev < imagesList.length - 1 ? prev + 1 : 0))}
                              className="p-2 bg-black/60 hover:bg-black/90 text-white rounded-xl transition shadow"
                              title="Next Photo"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Row */}
                  {imagesList.length > 1 && (
                    <div className="p-3 bg-gray-50 border-t border-b border-gray-100 flex items-center space-x-2 overflow-x-auto">
                      {imagesList.map((img, idx) => {
                        const thumbAngle = getAngleInfo(img.caption);
                        const isSelected = idx === activePhotoIdx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePhotoIdx(idx)}
                            className={`flex-shrink-0 relative rounded-xl overflow-hidden border-2 transition w-20 h-14 bg-black ${
                              isSelected ? 'border-emerald-600 ring-2 ring-emerald-400/40' : 'border-gray-200 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={img.image_url} alt={img.caption || ''} className="w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[9px] text-white font-bold truncate px-1 py-0.5 text-center">
                              {thumbAngle.label.split(' ')[0]}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                    {listing.parking_type}
                  </span>
                  <h1 className="text-2xl font-extrabold text-gray-900 mt-2">{listing.title}</h1>
                  <p className="text-sm text-gray-500 flex items-center space-x-1 mt-1">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>{listing.approximate_address}</span>
                  </p>
                </div>
                <div className="bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-2xl flex items-center space-x-1 text-sm font-bold border border-emerald-200">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{listing.average_rating || '4.9'}</span>
                </div>
              </div>

              <div className="border-t border-b border-gray-100 py-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-xs text-gray-400 block">Capacity</span>
                  <span className="text-sm font-bold text-gray-800">{listing.capacity} Slot(s)</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Hourly Price</span>
                  <span className="text-sm font-bold text-emerald-700">₹{listing.pricing_rule?.hourly_price || 40}/hr</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Daily Price</span>
                  <span className="text-sm font-bold text-emerald-700">₹{listing.pricing_rule?.daily_price || 300}/day</span>
                </div>
              </div>

              {listing.description && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">About Space</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{listing.description}</p>
                </div>
              )}

              {/* Vehicle Clearance & Dimensions Grid */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Car className="w-4 h-4 text-emerald-600" />
                  <span>Vehicle Clearance & Space Fit Limits</span>
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center text-xs pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-400 block font-bold">MAX LENGTH</span>
                    <span className="font-extrabold text-gray-800">{listing.max_length_m ? `${listing.max_length_m} m` : 'Standard SUV'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-400 block font-bold">MAX WIDTH</span>
                    <span className="font-extrabold text-gray-800">{listing.max_width_m ? `${listing.max_width_m} m` : 'Standard'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-400 block font-bold">CLEARANCE HEIGHT</span>
                    <span className="font-extrabold text-emerald-700">{listing.max_height_m ? `${listing.max_height_m} m` : 'No Height Limit'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Amenities & Security Features</h3>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  {listing.has_24_7_access && <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl">⏰ 24/7 Access</span>}
                  {listing.has_gated_access && <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl">🚪 Gated Access</span>}
                  {listing.has_security_guard && <span className="bg-purple-50 text-purple-800 px-3 py-1 rounded-xl">👮 Security Guard</span>}
                  {listing.is_covered && <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-xl">🛡️ Covered Roof</span>}
                  {listing.has_ev_charging && <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-xl">⚡ EV Charger Available</span>}
                  {listing.has_cctv && <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl">📹 24/7 CCTV</span>}
                  {listing.has_disabled_access && <span className="bg-purple-50 text-purple-800 px-3 py-1 rounded-xl">♿ Wheelchair Accessible</span>}
                </div>
              </div>

              {/* Host Parking Rules */}
              {listing.parking_rules && (
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
                  <h3 className="font-extrabold text-amber-900 text-xs flex items-center space-x-1.5">
                    <span>📋 Host Parking Rules & Guidelines</span>
                  </h3>
                  <p className="text-amber-900 leading-relaxed font-medium whitespace-pre-line">{listing.parking_rules}</p>
                </div>
              )}

              {/* Host Verification Breakdown */}
              <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Host Verification Breakdown</span>
                  </h3>
                  <span className="bg-emerald-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xs">
                    ✓ Verified Host
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700 bg-white p-3 rounded-xl border border-emerald-100">
                  <div className="flex items-center space-x-1.5 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Identity: <strong>Verified</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Phone: <strong>Verified</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Bank / UPI Payout: <strong>Verified</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Parking Ownership: <strong>Verified</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5 font-medium sm:col-span-2 pt-1 border-t border-gray-100">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Listing Status: <strong>Admin Approved ({listing.status})</strong></span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-950">
                  <Lock className="w-4 h-4 text-emerald-700" />
                  <span>Server-Enforced Location Privacy Boundary</span>
                </div>
                <p className="text-emerald-900 leading-relaxed">
                  <strong>Before Booking:</strong> API returns 📍 Approximate Area (<em>{listing.approximate_address}</em>) & randomized GPS radius.<br />
                  <strong>After Booking:</strong> 📍 Exact House Address, precise GPS coordinates, and host entry instructions are safely unlocked in your My Bookings pass.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Reservation Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-lg border border-emerald-100 p-6 space-y-5 sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span>Reserve Parking Slot</span>
            </h2>

            {/* Parking Plan Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Select Parking Plan</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('HOURLY')}
                  className={`p-3 rounded-2xl border text-left flex justify-between items-center transition ${
                    selectedPlan === 'HOURLY'
                      ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-extrabold block">⚡ Hourly / Short Visit</span>
                    <span className="text-[11px] text-gray-500 font-normal">Pay per hour for quick visits</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-800">₹{listing.pricing_rule?.hourly_price || 40}/hr</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('DAILY')}
                  className={`p-3 rounded-2xl border text-left flex justify-between items-center transition ${
                    selectedPlan === 'DAILY'
                      ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-extrabold block">📅 Daily Full-Day Pass</span>
                    <span className="text-[11px] text-gray-500 font-normal">24-Hour full day access</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-800">₹{listing.pricing_rule?.daily_price || 250}/day</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('MULTI_DAY')}
                  className={`p-3 rounded-2xl border text-left flex justify-between items-center transition ${
                    selectedPlan === 'MULTI_DAY'
                      ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-extrabold block">🧳 Multi-Day Tourist Plan</span>
                    <span className="text-[11px] text-emerald-700 font-bold">15% Off for multi-day stays</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-800">
                    ₹{Math.round((listing.pricing_rule?.daily_price || 250) * 0.85)}/day
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('MONTHLY_FULL')}
                  className={`p-3 rounded-2xl border text-left flex justify-between items-center transition ${
                    selectedPlan === 'MONTHLY_FULL'
                      ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-extrabold block">🏠 Monthly Pass (24/7 Access)</span>
                    <span className="text-[11px] text-gray-500 font-normal">Reserved space all month long</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-800">₹{listing.pricing_rule?.monthly_price || 3500}/mo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('MONTHLY_COMMUTER')}
                  className={`p-3 rounded-2xl border text-left flex justify-between items-center transition ${
                    selectedPlan === 'MONTHLY_COMMUTER'
                      ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-extrabold block">💼 Monthly Commuter Pass</span>
                    <span className="text-[11px] text-gray-500 font-normal">Mon-Fri 8:00 AM - 8:00 PM</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-800">₹{listing.pricing_rule?.monthly_commuter_price || 2200}/mo</span>
                </button>
              </div>
            </div>

            {listing?.is_reserved && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-xs text-amber-950 space-y-1 shadow-xs">
                <div className="flex items-center space-x-2 font-black text-amber-800 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Space Currently Reserved & Occupied</span>
                </div>
                <p className="leading-relaxed">
                  This parking spot currently has an active reservation. You cannot place a new reservation until the current vehicle completes parking.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold border border-red-200">
                {error}
              </div>
            )}

            {/* Time Window Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Vehicle Selection */}
            {user && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Vehicle</label>
                {vehicles.length === 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    No vehicles found on your profile.{' '}
                    <button onClick={() => navigate('/vehicles')} className="underline font-bold">Add vehicle here</button>
                  </div>
                ) : (
                  <select
                    value={selectedVehicleId || ''}
                    onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} ({v.vehicle_type} - {v.make || 'Default'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Price Breakdown */}
            {priceBreakdown && (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Duration ({priceBreakdown.duration_hours} hrs)</span>
                  <span>₹{priceBreakdown.parking_fee}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform Fee (10%)</span>
                  <span>₹{priceBreakdown.platform_fee}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST / Tax (5%)</span>
                  <span>₹{priceBreakdown.tax}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between font-extrabold text-sm text-gray-900">
                  <span>Total Amount</span>
                  <span className="text-emerald-800">₹{priceBreakdown.total_amount}</span>
                </div>
              </div>
            )}

            {/* Active 1-Minute Payment Session Card */}
            {activePendingBooking && (() => {
              const exp = activePendingBooking.payment_expires_at ? new Date(activePendingBooking.payment_expires_at).getTime() : 0;
              const sec = Math.max(0, Math.floor((exp - nowTime) / 1000));
              if (sec <= 0) return null;
              return (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-xs text-amber-950 space-y-2.5 shadow-sm animate-pulse">
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <span className="flex items-center space-x-1.5 text-sm">
                      <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                      <span>1-Minute Checkout Session Active</span>
                    </span>
                    <span className="font-mono text-xs font-black bg-amber-200 border border-amber-400 px-2.5 py-0.5 rounded-lg text-amber-950">
                      00:{('0' + sec).slice(-2)}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    This space is temporarily held for you. Complete payment before the timer expires to secure your spot.
                  </p>
                  <button
                    type="button"
                    onClick={() => resumePayment(activePendingBooking)}
                    disabled={bookingLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{bookingLoading ? 'Opening Razorpay...' : `Resume & Complete Payment (₹${activePendingBooking.total_amount})`}</span>
                  </button>
                </div>
              );
            })()}

            {/* Checkout Action Button */}
            <button
              onClick={handleReserveAndPay}
              disabled={Boolean(listing?.is_reserved) || bookingLoading || loadingPrice}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <CreditCard className="w-5 h-5" />
              <span>
                {listing?.is_reserved
                  ? '⛔ Space Currently Reserved'
                  : bookingLoading
                  ? 'Processing Checkout...'
                  : 'Confirm & Pay Now'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Image Zoom Lightbox Modal */}
      {inspectImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300">Verified Parking Photo (High Resolution)</span>
              <button
                onClick={() => setInspectImage(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[75vh]">
              <img src={inspectImage} alt="Enlarged space photo" className="w-full h-auto object-contain max-h-[75vh]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
