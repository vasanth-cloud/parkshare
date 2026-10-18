import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ParkingListing, Vehicle, Booking, Review } from '../types';
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  ShieldCheck,
  CreditCard,
  Car,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Calendar,
  Lock,
  ChevronDown,
  PlusCircle,
  ZoomIn,
  X,
  Phone,
  Navigation,
  MessageSquare
} from 'lucide-react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80';

// Helper to parse tags and text from driver reviews
const parseReviewComment = (raw?: string) => {
  if (!raw) return { tags: [] as string[], text: '' };

  // Format 1: "[Tag 1, Tag 2] — Comment text" or "[Tag 1, Tag 2]"
  const matchBracket = raw.match(/^\[(.*?)\](?:\s*—\s*(.*))?$/s);
  if (matchBracket) {
    const tagPart = matchBracket[1];
    const textPart = matchBracket[2] || '';
    const tags = tagPart.split(',').map((t) => t.trim()).filter(Boolean);
    return { tags, text: textPart.trim() };
  }

  // Format 2: Comma-separated list with emojis or short tokens
  const commaParts = raw.split(',').map((s) => s.trim());
  const looksLikeTags = commaParts.length > 1 && commaParts.every((p) => /[\u{1F300}-\u{1F9FF}]/u.test(p) || p.length < 35);
  if (looksLikeTags) {
    return { tags: commaParts, text: '' };
  }

  return { tags: [] as string[], text: raw };
};

export const CustomerListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState<ParkingListing | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [inspectImage, setInspectImage] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

  // Reviews from verified drivers
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [showReviewsOverview, setShowReviewsOverview] = useState<boolean>(false);
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | 'ALL'>('ALL');

  // Plan selection: HOURLY, DAILY, MONTHLY_FULL
  const [selectedPlan, setSelectedPlan] = useState<'HOURLY' | 'DAILY' | 'MONTHLY_FULL'>('HOURLY');
  const [durationHours, setDurationHours] = useState<number>(2);
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);

  // Time window selection
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  });

  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 3);
    return d.toISOString().slice(0, 16);
  });

  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePendingBooking, setActivePendingBooking] = useState<Booking | null>(null);
  const [userActiveBooking, setUserActiveBooking] = useState<Booking | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // 1-second interval to tick countdown timers
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch listing, reviews, and vehicles on mount
  useEffect(() => {
    if (id) {
      const listingId = parseInt(id);
      api.getListingDetail(listingId).then(setListing).catch(console.error);
      api.getReviewsByListing(listingId)
        .then((rList) => setReviews(rList || []))
        .catch(() => setReviews([]))
        .finally(() => setLoadingReviews(false));
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

  // Check active pending booking and existing active bookings
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
          const activeSession = bList.find(
            (b) =>
              b.listing_id === listing.id &&
              [
                'CONFIRMED',
                'DRIVER_ARRIVED',
                'ODOMETER_PHOTO_SUBMITTED',
                'KEY_HANDOVER_PENDING',
                'KEY_RECEIVED',
                'PARKING_ACTIVE',
                'ACTIVE',
                'VEHICLE_COLLECTION_REQUESTED'
              ].includes(b.status)
          );
          if (activeSession) {
            setUserActiveBooking(activeSession);
          }
        })
        .catch(console.error);
    }
  }, [user, listing]);

  // When quick duration chip is selected, calculate end time
  const handleQuickDuration = (hours: number) => {
    setDurationHours(hours);
    setIsCustomDuration(false);
    const start = new Date(startTime);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    setEndTime(end.toISOString().slice(0, 16));
  };

  // When start time changes and not custom, update end time to maintain duration
  const handleStartTimeChange = (newStartStr: string) => {
    setStartTime(newStartStr);
    if (!isCustomDuration && selectedPlan === 'HOURLY') {
      const start = new Date(newStartStr);
      const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
      setEndTime(end.toISOString().slice(0, 16));
    }
  };

  // Dynamically calculate price whenever times, plan, or listing changes
  useEffect(() => {
    if (!listing) return;
    setLoadingPrice(true);
    setError('');

    let effectiveEnd = endTime;
    if (selectedPlan === 'DAILY') {
      const d = new Date(startTime);
      d.setDate(d.getDate() + 1);
      effectiveEnd = d.toISOString().slice(0, 16);
    } else if (selectedPlan === 'MONTHLY_FULL') {
      const d = new Date(startTime);
      d.setDate(d.getDate() + 30);
      effectiveEnd = d.toISOString().slice(0, 16);
    }

    api.calculatePrice(
      listing.id,
      new Date(startTime).toISOString(),
      new Date(effectiveEnd).toISOString(),
      selectedPlan
    )
      .then(setPriceBreakdown)
      .catch((err) => {
        console.error('Price calculation error:', err);
        setError(err.message || 'Error calculating price.');
        setPriceBreakdown(null);
      })
      .finally(() => setLoadingPrice(false));
  }, [listing, startTime, endTime, selectedPlan]);

  const resumePayment = async (existingBooking: Booking) => {
    try {
      setBookingLoading(true);
      setError('');
      const orderData = await api.createPaymentOrder(existingBooking.id);

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        throw new Error('Razorpay Checkout SDK not loaded. Please refresh the page and try again.');
      }

      const options = {
        key: orderData.key_id || 'rzp_test_TjLLsOAid1sNkb',
        amount: orderData.amount_in_paise || Math.round((orderData.amount || existingBooking.total_amount) * 100),
        currency: orderData.currency || 'INR',
        name: 'ParkCo Parking',
        description: `Booking #${existingBooking.booking_reference} - ${listing!.title}`,
        order_id: orderData.order_id,
        prefill: {
          name: user?.full_name || 'Customer',
          email: user?.email || '',
          contact: user?.phone_number || '',
        },
        theme: {
          color: '#2563eb',
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
              booking_id: existingBooking.id,
              order_id: response.razorpay_order_id || orderData.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            navigate('/bookings?service=parking');
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
      setError(err.message || 'Failed to resume payment.');
      setBookingLoading(false);
    }
  };

  const handleReserveAndPay = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!listing) return;

    if (listing.is_reserved) {
      setError('This parking space is currently occupied. Please select another space.');
      return;
    }

    if (!selectedVehicleId) {
      setError('Please select or add a vehicle to continue.');
      return;
    }

    setBookingLoading(true);
    setError('');

    try {
      const newBooking = await api.createBooking({
        listing_id: listing.id,
        vehicle_id: selectedVehicleId,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        booking_product_type: selectedPlan,
      });

      setActivePendingBooking(newBooking);

      const orderData = await api.createPaymentOrder(newBooking.id);

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        throw new Error('Razorpay Checkout SDK not loaded. Please refresh the page and try again.');
      }

      const options = {
        key: orderData.key_id || 'rzp_test_TjLLsOAid1sNkb',
        amount: orderData.amount_in_paise || Math.round((orderData.amount || newBooking.total_amount) * 100),
        currency: orderData.currency || 'INR',
        name: 'ParkCo Parking',
        description: `Booking #${newBooking.booking_reference} - ${listing!.title}`,
        order_id: orderData.order_id,
        prefill: {
          name: user.full_name || 'Customer',
          email: user.email || '',
          contact: user.phone_number || '',
        },
        theme: {
          color: '#2563eb',
        },
        modal: {
          ondismiss: () => {
            setBookingLoading(false);
            setError('Checkout closed. Complete payment before the 1-minute hold expires.');
          },
        },
        handler: async (response: any) => {
          try {
            setBookingLoading(true);
            await api.verifyPayment({
              booking_id: newBooking.id,
              order_id: response.razorpay_order_id || orderData.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            navigate('/bookings?service=parking');
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
      setError(err.message || 'Failed to complete reservation.');
      setBookingLoading(false);
    }
  };

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading spot details...</span>
        </div>
      </div>
    );
  }

  const imagesList = (listing.images && listing.images.length > 0)
    ? listing.images
    : [{ image_url: FALLBACK_IMAGE, caption: 'PARKING_SLOT', is_cover: true }];
  const currentPhoto = imagesList[activePhotoIdx] || imagesList[0];

  const hourlyRate = listing.pricing_rule?.hourly_price || 40;
  const dailyRate = listing.pricing_rule?.daily_price || 250;
  const monthlyRate = listing.pricing_rule?.monthly_price || 3500;

  const currentPrice = priceBreakdown?.total_amount ?? (
    selectedPlan === 'HOURLY' ? hourlyRate * durationHours : selectedPlan === 'DAILY' ? dailyRate : monthlyRate
  );

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Reviews overview calculations
  const totalReviewsCount = reviews.length;
  const computedAvgRating = listing.average_rating > 0
    ? listing.average_rating
    : totalReviewsCount > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount
    : 0;

  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const tagFrequency: Record<string, number> = {};
  let firstSnippet = '';

  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
    }
    const { tags, text } = parseReviewComment(r.comment);
    tags.forEach((t) => {
      tagFrequency[t] = (tagFrequency[t] || 0) + 1;
    });
    if (!firstSnippet && text) {
      firstSnippet = text;
    }
  });

  const topTags = Object.entries(tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  const filteredReviews = reviews.filter((r) => {
    if (reviewRatingFilter === 'ALL') return true;
    return r.rating === reviewRatingFilter;
  });

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-28">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-[#F6F8FA]/90 dark:bg-slate-950/90 backdrop-blur-md px-4 py-3 border-b border-slate-200/80 dark:border-slate-850 flex items-center justify-between max-w-lg mx-auto">
        <button
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h1 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reservation</h1>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[200px]">
            Verified Parking Bay
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowReviewsOverview(true)}
          className="flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition cursor-pointer"
          title="View reviews and ratings overview"
        >
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>{computedAvgRating > 0 ? computedAvgRating.toFixed(1) : (totalReviewsCount > 0 ? computedAvgRating.toFixed(1) : '4.9')}</span>
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-3 space-y-4">
        {/* Active Hold Alert */}
        {activePendingBooking && (() => {
          const exp = activePendingBooking.payment_expires_at ? new Date(activePendingBooking.payment_expires_at).getTime() : 0;
          const sec = Math.max(0, Math.floor((exp - nowTime) / 1000));
          if (sec <= 0) return null;
          return (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-xs">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-600 animate-spin flex-shrink-0" />
                <div>
                  <span className="font-extrabold block">Holding Spot for You</span>
                  <span className="text-[11px] opacity-80">Expires in 00:{('0' + sec).slice(-2)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => resumePayment(activePendingBooking)}
                disabled={bookingLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                Pay ₹{activePendingBooking.total_amount}
              </button>
            </div>
          );
        })()}

        {/* Hero Photo Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-sm bg-slate-900 border border-slate-200/80 dark:border-slate-800 aspect-[16/10] w-full">
          <img
            src={currentPhoto.image_url}
            alt={listing.title}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
            className="w-full h-full object-cover"
          />

          {/* Top badges */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
            <span className="bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs border border-white/10 pointer-events-auto">
              {listing.parking_type}
            </span>
            <div className="flex items-center space-x-1.5 pointer-events-auto">
              {imagesList.length > 1 && (
                <span className="bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-xs border border-white/10">
                  {activePhotoIdx + 1} / {imagesList.length}
                </span>
              )}
              <button
                type="button"
                onClick={() => setInspectImage(currentPhoto.image_url)}
                className="w-7 h-7 rounded-full bg-slate-900/80 backdrop-blur-md text-white flex items-center justify-center border border-white/10 shadow-xs hover:bg-slate-800 transition cursor-pointer"
                title="Zoom Photo"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Carousel arrows if multiple */}
          {imagesList.length > 1 && (
            <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none">
              <button
                type="button"
                onClick={() => setActivePhotoIdx((p) => (p > 0 ? p - 1 : imagesList.length - 1))}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition shadow-sm pointer-events-auto cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActivePhotoIdx((p) => (p < imagesList.length - 1 ? p + 1 : 0))}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition shadow-sm pointer-events-auto cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom gradient with pricing pill */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex items-end justify-between pointer-events-none">
            <div className="text-white pointer-events-auto">
              <span className="text-[11px] font-medium text-slate-300 block">Starting at</span>
              <span className="text-xl font-extrabold text-white">₹{hourlyRate}<span className="text-xs font-normal text-slate-300">/hr</span></span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 px-2.5 py-1 rounded-full shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Space</span>
            </div>
          </div>
        </div>

        {/* Space Title & Location */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                Verified Parking Space ({listing.parking_type.replace(/_/g, ' ')})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="truncate">
                  {listing.exact_address ? listing.exact_address : `Near ${listing.area || 'your destination'} • Approx. ~350 m away`}
                </span>
              </p>
            </div>
            <div className="text-right flex-shrink-0 pl-2">
              <span className="text-[10px] text-slate-400 block font-bold">CAPACITY</span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{listing.capacity} Bay{listing.capacity > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Privacy Location Status: Unlocked vs Hidden */}
          {listing.exact_address ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Exact Address Unlocked (Confirmed Booking)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center space-x-1 transition shadow-xs cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate</span>
                </button>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                {listing.exact_address}
              </p>
              {listing.access_instructions && (
                <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block">Gate / Barrier Access Instructions:</span>
                  <span>{listing.access_instructions}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-slate-800/80 dark:to-slate-800/50 rounded-2xl p-3 border border-blue-200/80 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 dark:text-blue-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span>Host & Location Privacy Guarantee</span>
                </span>
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                  Locked Before Booking
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                The <strong>exact building/plot address and host phone number</strong> are kept private and revealed immediately after your booking is confirmed.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-0.5 text-[10px]">
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-blue-100 dark:border-slate-700 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Exact Address: <strong className="text-slate-800 dark:text-slate-200 block">Unlocked after payment</strong></span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-blue-100 dark:border-slate-700 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Host Mobile No: <strong className="text-slate-800 dark:text-slate-200 block">Unlocked after payment</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Clean Amenity Tags */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {listing.is_covered && (
              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl text-[11px] font-semibold">
                 Covered
              </span>
            )}
            {listing.has_ev_charging && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 px-2.5 py-1 rounded-xl text-[11px] font-semibold">
                 EV Charger
              </span>
            )}
            {listing.has_cctv && (
              <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 px-2.5 py-1 rounded-xl text-[11px] font-semibold">
                 CCTV
              </span>
            )}
            {listing.has_gated_access && (
              <span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800 px-2.5 py-1 rounded-xl text-[11px] font-semibold">
                 Gated
              </span>
            )}
            {listing.has_24_7_access && (
              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl text-[11px] font-semibold">
                ⏰ 24/7 Access
              </span>
            )}
          </div>
        </div>

        {/* Space Live Availability Indicator */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">Slot Availability:</span>
          {listing.is_reserved || (listing.available_spaces !== undefined && listing.available_spaces === 0) ? (
            <span className="font-black text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center space-x-1">
              <span>Fully Occupied ({listing.capacity}/{listing.capacity} Booked)</span>
            </span>
          ) : (
            <span className="font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
              <span>{listing.available_spaces ?? listing.capacity} of {listing.capacity} {listing.capacity === 1 ? 'spot' : 'spots'} available</span>
            </span>
          )}
        </div>

        {/* Existing Active Booking Banner if user already booked */}
        {userActiveBooking && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300/80 dark:border-emerald-800 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs shadow-xs">
            <div>
              <span className="font-black text-emerald-900 dark:text-emerald-200 block">You already have an active pass here!</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">Ref #{userActiveBooking.booking_reference} • Status: {userActiveBooking.status.replace(/_/g, ' ')}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/bookings?service=parking')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl transition text-xs shadow-xs flex-shrink-0 cursor-pointer"
            >
              View Pass
            </button>
          </div>
        )}

        {/* Occupied Notice if reserved / fully booked */}
        {(listing.is_reserved || (listing.available_spaces !== undefined && listing.available_spaces === 0)) && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 flex items-center space-x-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="leading-tight">
              <strong>All Parking Spaces Occupied.</strong> All {listing.capacity} {listing.capacity === 1 ? 'spot is' : 'spots are'} currently occupied by active vehicles. New bookings are paused until a vehicle departs.
            </p>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Booking Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          {/* Plan Selector (Tabs) */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setSelectedPlan('HOURLY')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                selectedPlan === 'HOURLY'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
               Hourly
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan('DAILY')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                selectedPlan === 'DAILY'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
               1-Day Pass
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan('MONTHLY_FULL')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                selectedPlan === 'MONTHLY_FULL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
               Monthly
            </button>
          </div>

          {/* Duration Chips (Hourly mode) */}
          {selectedPlan === 'HOURLY' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Quick Duration
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3].map((hr) => (
                  <button
                    key={hr}
                    type="button"
                    onClick={() => handleQuickDuration(hr)}
                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                      !isCustomDuration && durationHours === hr
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {hr} {hr === 1 ? 'Hour' : 'Hours'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomDuration(true)}
                  className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                    isCustomDuration
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>
          )}

          {/* Time Picker Inputs */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Arrival Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Departure Time
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setIsCustomDuration(true);
                }}
                disabled={selectedPlan !== 'HOURLY'}
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Vehicle Selection Card */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Parking Vehicle
              </span>
              <button
                type="button"
                onClick={() => navigate('/vehicles')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Manage</span>
              </button>
            </div>

            {vehicles.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">No vehicle registered yet</span>
                <button
                  type="button"
                  onClick={() => navigate('/vehicles')}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  + Add Vehicle
                </button>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedVehicleId || ''}
                  onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer pr-8"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_type ==='BIKE'|| v.vehicle_type ==='SCOOTER'?'':''} {v.registration_number} • {v.make ||'Vehicle'} {v.model ||''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>


          {/* Simple Price Summary */}
          {priceBreakdown && (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Parking Fee ({priceBreakdown.duration_hours || durationHours} hrs)</span>
                <span>₹{priceBreakdown.parking_fee}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Taxes & Platform</span>
                <span>₹{(priceBreakdown.platform_fee || 0) + (priceBreakdown.tax || 0)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span className="text-blue-600 dark:text-blue-400">₹{priceBreakdown.total_amount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Reassurance & Host Information */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Verified Host & Access Security</span>
          </div>

          {/* Host Details Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                  {(listing.host?.full_name || 'H').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {listing.host?.full_name || 'Verified Host'}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded-md">
                      Verified
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Host on ParkCo • {listing.host_type || 'INDIVIDUAL'}
                  </span>
                </div>
              </div>

            </div>

            {/* Contact details status */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Host Mobile:</span>
              <span className="font-mono text-slate-500 dark:text-slate-400 text-xs flex items-center space-x-1">
                <Lock className="w-3 h-3 text-amber-500" />
                <span>+91 ••••• ••••0</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans font-bold ml-1 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-900">
                  (Revealed after booking)
                </span>
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            For security and privacy, the exact gate PIN, precise bay marker, and host phone number will automatically appear on your active pass immediately after checkout.
          </p>

          {listing.description && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">About Spot</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                {listing.description}
              </p>
            </div>
          )}

          {listing.parking_rules && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Host Guidelines</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">
                {listing.parking_rules}
              </p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* DRIVER RATINGS & REVIEWS (Simple / Compact Card with Overview Modal)      */}
        {/* ========================================================================= */}
        <div
          onClick={() => setShowReviewsOverview(true)}
          className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/80 hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center text-amber-500 shadow-xs group-hover:scale-105 transition transform">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {computedAvgRating > 0 ? `${computedAvgRating.toFixed(1)} / 5.0` : 'New Space'}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    • {totalReviewsCount} {totalReviewsCount === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Verified driver feedback & ratings overview
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 group-hover:bg-blue-600 group-hover:text-white transition">
              <span>View Overview</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition transform" />
            </div>
          </div>

          {/* Quick Preview of Top Praise Tags & Latest Review Snippet */}
          {topTags.length > 0 ? (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {topTags.slice(0, 3).map(({ tag, count }) => (
                  <span
                    key={tag}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                  >
                    {tag} {count > 1 ? `(${count})` : ''}
                  </span>
                ))}
              </div>
              {firstSnippet && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                  “{firstSnippet}”
                </p>
              )}
            </div>
          ) : totalReviewsCount > 0 && firstSnippet ? (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                “{firstSnippet}”
              </p>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
              {totalReviewsCount === 0 ? 'No driver reviews yet. Click to view overview.' : 'Tap to view the complete rating breakdown and reviews.'}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-16 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Payable</div>
            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {loadingPrice ? (
                <span className="text-xs text-slate-400">Calculating...</span>
              ) : (
                `₹${currentPrice}`
              )}
            </div>
          </div>

          <button
            onClick={handleReserveAndPay}
            disabled={Boolean(listing?.is_reserved || (listing?.available_spaces !== undefined && listing.available_spaces === 0)) || bookingLoading || loadingPrice}
            className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold py-3.5 px-5 rounded-2xl shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {listing?.is_reserved || (listing?.available_spaces !== undefined && listing.available_spaces === 0)
                ? 'All Spots Occupied'
                : bookingLoading
                ? 'Opening Payment...'
                : `Reserve & Pay ₹${currentPrice}`}
            </span>
          </button>
        </div>
      </div>

      {/* Lightbox Zoom Modal */}
      {inspectImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 p-3 space-y-3">
            <div className="flex items-center justify-between text-white pb-1">
              <span className="text-xs font-bold text-slate-300">Verified Parking Slot Photo</span>
              <button
                type="button"
                onClick={() => setInspectImage(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
              <img src={inspectImage} alt="Parking space" className="w-full h-auto object-contain max-h-[70vh]" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRIVER RATINGS & REVIEWS OVERVIEW MODAL                                   */}
      {/* ========================================================================= */}
      {showReviewsOverview && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowReviewsOverview(false)}
        >
          <div
            className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Reviews & Ratings Overview
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Verified driver feedback for this parking bay
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewsOverview(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Score & Rating Breakdown Section */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Left: Overall Score */}
                  <div className="sm:col-span-5 text-center sm:text-left sm:border-r sm:border-slate-200 dark:sm:border-slate-700 sm:pr-4">
                    <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                      {computedAvgRating > 0 ? computedAvgRating.toFixed(1) : '—'}
                    </div>
                    <div className="flex items-center justify-center sm:justify-start space-x-1 my-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= Math.round(computedAvgRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {totalReviewsCount} {totalReviewsCount === 1 ? 'verified review' : 'verified reviews'}
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      <span>100% Verified Parkers</span>
                    </span>
                  </div>

                  {/* Right: Star Distribution Bars */}
                  <div className="sm:col-span-7 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = ratingCounts[stars] || 0;
                      const pct = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
                      return (
                        <div key={stars} className="flex items-center space-x-2 text-[11px]">
                          <span className="w-5 font-bold text-slate-600 dark:text-slate-400 text-right">{stars}★</span>
                          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 font-mono text-[10px] text-slate-400 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Verified Driver Praise Highlights */}
              {topTags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Driver Highlights
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {topTags.map(({ tag, count }) => (
                      <span
                        key={tag}
                        className="inline-flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold"
                      >
                        <span>{tag}</span>
                        <span className="bg-emerald-200/60 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                          {count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Filter Pills */}
              {totalReviewsCount > 0 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setReviewRatingFilter('ALL')}
                    className={`text-[11px] font-bold px-3 py-1 rounded-full transition cursor-pointer ${
                      reviewRatingFilter === 'ALL'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    All ({totalReviewsCount})
                  </button>
                  {[5, 4, 3, 2, 1].map((st) => {
                    const count = ratingCounts[st] || 0;
                    if (count === 0) return null;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setReviewRatingFilter(st)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 transition cursor-pointer ${
                          reviewRatingFilter === st
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        <span>{st} ★</span>
                        <span className="opacity-80 font-normal">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Detailed Reviews List */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Verified Reviews ({filteredReviews.length})
                </span>

                {loadingReviews ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading reviews...</div>
                ) : filteredReviews.length === 0 ? (
                  <div className="py-8 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-1.5">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {totalReviewsCount === 0 ? 'No driver reviews yet' : 'No reviews match this rating filter'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      {totalReviewsCount === 0
                        ? 'Be the first driver to book this driveway space and share your verified experience!'
                        : 'Try selecting All or a different star rating filter.'}
                    </p>
                  </div>
                ) : (
                  filteredReviews.map((r) => {
                    const { tags, text } = parseReviewComment(r.comment);
                    return (
                      <div
                        key={`modal-review-${r.id}`}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2 hover:border-slate-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                              {r.user_name ? r.user_name.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                  {r.user_name || 'Verified Driver'}
                                </span>
                                <span className="inline-flex items-center space-x-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md">
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Verified Parker</span>
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {new Date(r.created_at).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-0.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${star <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                              />
                            ))}
                          </div>
                        </div>

                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {text && (
                          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5">
                            {text}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
              <button
                type="button"
                onClick={() => setShowReviewsOverview(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
