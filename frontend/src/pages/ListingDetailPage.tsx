import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Shield, Star, Car, Zap, CheckCircle, Clock, DollarSign, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { ParkingListing, Vehicle } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const listingId = parseInt(id || '0', 10);
  
  const [listing, setListing] = useState<ParkingListing | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(0);
  
  // Date/Time Selection
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [durationHours, setDurationHours] = useState(3);
  
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!listingId) return;
    api.getListingDetail(listingId)
      .then(setListing)
      .catch(console.error)
      .finally(() => setLoading(false));

    if (user) {
      api.getVehicles().then((data) => {
        setVehicles(data);
        if (data.length > 0) setSelectedVehicleId(data[0].id);
      }).catch(console.error);
    }
  }, [listingId, user]);

  useEffect(() => {
    if (!listingId) return;
    const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endIso = new Date(new Date(`${startDate}T${startTime}:00`).getTime() + durationHours * 3600 * 1000).toISOString();

    api.calculatePrice(listingId, startIso, endIso)
      .then(setPriceBreakdown)
      .catch((err) => setError(err.message));
  }, [listingId, startDate, startTime, durationHours]);

  const handleReserve = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedVehicleId) {
      setError('Please add or select a vehicle before reserving.');
      return;
    }

    setError('');
    setBookingInProgress(true);

    try {
      const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endIso = new Date(new Date(`${startDate}T${startTime}:00`).getTime() + durationHours * 3600 * 1000).toISOString();

      // 1. Create Booking (triggers server-side double booking concurrency check)
      const booking = await api.createBooking({
        listing_id: listingId,
        vehicle_id: selectedVehicleId,
        start_time: startIso,
        end_time: endIso,
      });

      // 2. Create Payment Order
      const paymentOrder = await api.createPaymentOrder(booking.id);

      // 3. Verify Payment (Mock payment mode)
      await api.verifyPayment({
        booking_id: booking.id,
        order_id: paymentOrder.order_id,
        payment_id: `pay_mock_${Date.now()}`,
        signature: 'sig_mock_auto_approve',
      });

      // Redirect to Parker Dashboard
      navigate('/dashboard?success=1');
    } catch (err: any) {
      setError(err.message || 'Booking failed');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return <div className="text-center py-20 text-slate-500">Listing not found</div>;
  }

  const coverImage = listing.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
          <span>{listing.parking_type.replace('_', ' ')}</span>
          <span>•</span>
          <span>{listing.city}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">{listing.title}</h1>
        <p className="flex items-center text-sm text-slate-500 mt-1">
          <MapPin className="w-4 h-4 text-emerald-600 mr-1 flex-shrink-0" />
          <span>{listing.approximate_address}</span>
        </p>
      </div>

      {/* Main Grid: Image & Reserve Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Gallery & Features */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-80 sm:h-96 rounded-3xl overflow-hidden bg-slate-100 border border-slate-200">
            <img src={coverImage} alt={listing.title} className="w-full h-full object-cover" />
          </div>

          {/* Privacy Shield Alert Banner */}
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-start space-x-3 text-emerald-900 text-xs">
            <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Host Location Privacy Protected</p>
              <p className="mt-0.5 text-emerald-800">
                To protect host privacy for residential driveways, exact building number, address details, and host contact notes are disclosed <span className="font-bold">only after booking confirmation</span>.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">About this parking space</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{listing.description || 'No description provided.'}</p>
          </div>

          {/* Amenities Grid */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Features & Amenities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-semibold text-slate-700">
              {listing.is_covered && <div className="p-3 bg-slate-50 rounded-xl flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-600" /><span>Covered Parking</span></div>}
              {listing.has_cctv && <div className="p-3 bg-slate-50 rounded-xl flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-600" /><span>24/7 CCTV</span></div>}
              {listing.has_ev_charging && <div className="p-3 bg-slate-50 rounded-xl flex items-center space-x-2"><Zap className="w-4 h-4 text-amber-500 fill-amber-500" /><span>EV Charger</span></div>}
              {listing.is_indoor && <div className="p-3 bg-slate-50 rounded-xl flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-600" /><span>Indoor Garage</span></div>}
            </div>
          </div>
        </div>

        {/* Right Col: Booking & Price Checkout Card */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-5 sticky top-24">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-2xl font-extrabold text-slate-900">₹{listing.pricing_rule?.hourly_price || 30}</span>
                <span className="text-xs text-slate-500 font-normal"> / hour</span>
              </div>
              <div className="flex items-center space-x-1 text-xs font-bold text-slate-700">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{listing.average_rating > 0 ? listing.average_rating.toFixed(1) : 'New'}</span>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-200 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Date & Time Selectors */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration</label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    {[1, 2, 3, 4, 5, 8, 12, 24].map((h) => (
                      <option key={h} value={h}>{h} {h === 1 ? 'hour' : 'hours'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vehicle Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Vehicle</label>
                {vehicles.length > 0 ? (
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} ({v.vehicle_type})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    No saved vehicles found.{' '}
                    <Link to="/dashboard" className="font-bold underline">Add a vehicle in dashboard</Link>
                  </div>
                )}
              </div>
            </div>

            {/* Price Breakdown */}
            {priceBreakdown && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Parking fee ({priceBreakdown.duration_hours} hrs)</span>
                  <span>₹{priceBreakdown.parking_fee}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Platform fee</span>
                  <span>₹{priceBreakdown.platform_fee}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST / Tax (5%)</span>
                  <span>₹{priceBreakdown.tax}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Payable</span>
                  <span className="text-emerald-700">₹{priceBreakdown.total_amount}</span>
                </div>
              </div>
            )}

            {/* Reserve CTA */}
            <button
              onClick={handleReserve}
              disabled={bookingInProgress}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 text-sm transition-all disabled:opacity-50"
            >
              {bookingInProgress ? 'Reserving Space...' : 'Reserve & Pay Now'}
            </button>

          </div>
        </div>

      </div>

    </div>
  );
};
