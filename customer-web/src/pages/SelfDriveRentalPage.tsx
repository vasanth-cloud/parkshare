import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home,
  Compass,
  Calendar,
  Heart,
  User,
  Car,
  Bike,
  Zap,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  ArrowLeft,
  Phone,
  Shield,
  Search,
  SlidersHorizontal,
  X,
  AlertCircle,
  KeyRound,
  Navigation,
  Lock,
  CheckCircle2,
  Building,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  Eye,
  RotateCcw,
  Camera,
  Luggage,
  Palette,
  Fuel,
  FileText,
  BadgeCheck,
  PhoneCall,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RentalVehicle, RentalBooking } from '../types';
import { CustomerProfilePage } from './CustomerProfilePage';
import { RentalRouteNavigationMap } from '../components/RentalRouteNavigationMap';
import { LiveRentalTimer } from '../components/LiveRentalTimer';

export type RentalTab = 'home' | 'explore' | 'bookings' | 'saved' | 'profile';

const TIME_OPTIONS = [
  '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
];

const BENGALURU_HUBS = [
  { id: 'INDIRANAGAR', name: 'Indiranagar 100ft Road Metro Hub', area: 'Indiranagar', landmark: 'Opp. BDA Complex / Metro Pillar 84', city: 'Bengaluru' },
  { id: 'KORAMANGALA', name: 'Koramangala 4th Block Hub', area: 'Koramangala', landmark: 'Near Sony World Signal', city: 'Bengaluru' },
  { id: 'HSR', name: 'HSR Layout Sector 1 Hub', area: 'HSR Layout', landmark: '27th Main Road, Sector 1', city: 'Bengaluru' },
  { id: 'WHITEFIELD', name: 'Whitefield ITPL Hub', area: 'Whitefield', landmark: 'Opp. ITPL Main Gate 2', city: 'Bengaluru' },
  { id: 'AIRPORT', name: 'Kempegowda Intl Airport Hub', area: 'Devanahalli', landmark: 'T1 Rental Pickup Bay P4', city: 'Bengaluru' },
  { id: 'MAJESTIC', name: 'Majestic Central Hub', area: 'Central Bengaluru', landmark: 'Platform 1 Metro Concourse', city: 'Bengaluru' }
];

// Clean default fleet - vehicles registered by hosts or via API will appear here
const DEFAULT_RENTAL_FLEET: RentalVehicle[] = [];

// Clean initial rental bookings
const INITIAL_RENTAL_BOOKINGS: RentalBooking[] = [];


export const SelfDriveRentalPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Tab State: default is 'home' as requested in Image 2
  const initialTab = (searchParams.get('tab') as RentalTab) || 'home';
  const [activeTab, setActiveTabState] = useState<RentalTab>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as RentalTab;
    if (tabParam && ['home', 'explore', 'bookings', 'saved', 'profile'].includes(tabParam)) {
      setActiveTabState(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: RentalTab) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [vehicles, setVehicles] = useState<RentalVehicle[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

  // Saved / Wishlisted Vehicles in LocalStorage (filtering out any obsolete dummy IDs)
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('parkco_saved_rentals');
      const parsed = stored ? JSON.parse(stored) : [];
      const dummyIds = new Set(['veh-fronx-00', 'veh-creta-01', 'veh-thar-02', 'veh-nexon-03', 'veh-swift-04', 'veh-hunter-05', 'veh-ather-06', 'veh-activa-07']);
      return Array.isArray(parsed) ? parsed.filter((id: string) => !dummyIds.has(id)) : [];
    } catch {
      return [];
    }
  });

  const toggleSave = (vehicleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedIds(prev => {
      const next = prev.includes(vehicleId)
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId];
      localStorage.setItem('parkco_saved_rentals', JSON.stringify(next));
      return next;
    });
  };

  // Rental Bookings in LocalStorage (filtering out any obsolete dummy bookings)
  const [rentalBookings, setRentalBookings] = useState<RentalBooking[]>(() => {
    try {
      const stored = localStorage.getItem('parkco_rental_bookings');
      const parsed = stored ? JSON.parse(stored) : [];
      const dummyBookingIds = new Set(['RNT-892410', 'RNT-661902']);
      return Array.isArray(parsed) ? parsed.filter((b: RentalBooking) => !dummyBookingIds.has(b.bookingId)) : [];
    } catch {
      return [];
    }
  });

  const saveRentalBookings = (newBookings: RentalBooking[]) => {
    setRentalBookings(newBookings);
    try {
      localStorage.setItem('parkco_rental_bookings', JSON.stringify(newBookings));
    } catch {}
  };

  // Proximity & Location State
  const [selectedArea, setSelectedArea] = useState<string>('INDIRANAGAR');
  const [isUsingGps, setIsUsingGps] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsAddressName, setGpsAddressName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for Home page (matching Screenshot 2)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDatesModalOpen, setIsDatesModalOpen] = useState(false);
  const [isTryOnModalOpen, setIsTryOnModalOpen] = useState(false);
  const [tryOnColor, setTryOnColor] = useState<'white' | 'red' | 'blue' | 'grey'>('white');
  const [tryOnTab, setTryOnTab] = useState<'360' | 'boot' | 'interior'>('360');

  // Category, Transmission, Fuel & Advanced Filters
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CAR' | 'BIKE' | 'EV'>('ALL');
  const [transmissionFilter, setTransmissionFilter] = useState<'ANY' | 'AUTOMATIC' | 'MANUAL'>('ANY');
  const [fuelFilter, setFuelFilter] = useState<'ANY' | 'PETROL' | 'DIESEL' | 'ELECTRIC'>('ANY');
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'RATING'>('DEFAULT');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Booking Modal State
  const [selectedVehicle, setSelectedVehicle] = useState<RentalVehicle | null>(null);

  // Date & Time state
  const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pickupTime, setPickupTime] = useState('10:00 AM');
  const [returnDate, setReturnDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [returnTime, setReturnTime] = useState('06:00 PM');

  // Handover & Extras
  const [deliveryType, setDeliveryType] = useState<'HUB_PICKUP' | 'DOORSTEP_DELIVERY'>('HUB_PICKUP');
  const [doorstepAddress, setDoorstepAddress] = useState('');
  const [withInsurance, setWithInsurance] = useState(true);

  // Customer & Payment Info
  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem('parkco_driver_name') || user?.full_name || 'SURENDAR RAM';
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    return localStorage.getItem('parkco_driver_phone') || user?.phone_number || '9384279920';
  });
  const [customerEmail, setCustomerEmail] = useState(() => {
    return localStorage.getItem('parkco_driver_email') || user?.email || 'surendar.ram@example.com';
  });
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'MOCK'>('UPI');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<RentalBooking | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [copiedOtp, setCopiedOtp] = useState<number | null>(null);

  // Filter Bookings Sub-tab
  const [bookingsFilter, setBookingsFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');

  useEffect(() => {
    fetchVehicles();
    const handleFocus = () => {
      fetchVehicles();
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchVehicles();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeTab]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('parkshare_customer_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.areaId) {
          setSelectedArea(parsed.areaId);
        } else if (parsed.title) {
          setGpsAddressName(`${parsed.title}, ${parsed.subtitle}`);
          setIsUsingGps(true);
        }
      }
    } catch {}

    const handleLocationChange = (e: any) => {
      const detail = e.detail;
      if (detail?.areaId) {
        setSelectedArea(detail.areaId);
        setIsUsingGps(false);
      } else if (detail?.title) {
        setGpsAddressName(`${detail.title}, ${detail.subtitle}`);
        setIsUsingGps(true);
      }
    };
    window.addEventListener('parkshare_location_updated', handleLocationChange);
    return () => window.removeEventListener('parkshare_location_updated', handleLocationChange);
  }, []);

  const fetchVehicles = async (lat?: number, lng?: number, queryStr?: string) => {
    setLoading(true);
    try {
      const effLat = lat !== undefined ? lat : userCoords?.lat;
      const effLng = lng !== undefined ? lng : userCoords?.lng;
      const effQuery = queryStr !== undefined ? queryStr : searchQuery;
      const data = await api.getRentalVehicles({
        lat: effLat,
        lng: effLng,
        query: effQuery,
        type: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        transmission: transmissionFilter !== 'ANY' ? transmissionFilter : undefined,
      });
      if (Array.isArray(data)) {
        setVehicles(data);
      } else {
        setVehicles([]);
      }
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // Live Location & GPS permission on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          fetchVehicles(coords.lat, coords.lng, searchQuery);
        },
        (err) => {
          console.warn('Geolocation access:', err.message);
          fetchVehicles();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      fetchVehicles();
    }
  }, []);

  // Search input debounce re-fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVehicles(userCoords?.lat, userCoords?.lng, searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter, transmissionFilter]);

  // Active booking status polling (checks every 2.5 seconds if host verified OTP)
  useEffect(() => {
    const activeBookingId = confirmedBooking?.bookingId;
    const interval = setInterval(async () => {
      if (activeBookingId) {
        try {
          const res = await api.getRentalBookings({ bookingId: activeBookingId });
          if (Array.isArray(res) && res.length > 0) {
            const latest = res[0];
            if (latest.status !== confirmedBooking?.status || latest.tripStartedAt !== confirmedBooking?.tripStartedAt) {
              setConfirmedBooking(latest);
              setRentalBookings(prev => prev.map(b => b.bookingId === latest.bookingId ? latest : b));
            }
          }
        } catch {}
      }
      if (activeTab === 'bookings' && customerPhone) {
        try {
          const list = await api.getRentalBookings({ phone: customerPhone });
          if (Array.isArray(list) && list.length > 0) {
            setRentalBookings(list);
          }
        } catch {}
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [confirmedBooking?.bookingId, confirmedBooking?.status, activeTab, customerPhone]);

  // Helper: compute distance for a vehicle based on selected area
  const getProximityKm = (vehicle: RentalVehicle, areaId: string): number => {
    const loc = (vehicle.hubAddress || vehicle.city || '').toLowerCase();
    if (areaId === 'KORAMANGALA') {
      if (loc.includes('koramangala')) return 0.7;
      if (loc.includes('hsr')) return 2.8;
      if (loc.includes('indiranagar')) return 4.9;
      if (loc.includes('whitefield')) return 14.2;
      return 3.5;
    }
    if (areaId === 'INDIRANAGAR') {
      if (loc.includes('indiranagar')) return 0.5;
      if (loc.includes('koramangala')) return 4.8;
      if (loc.includes('whitefield')) return 9.5;
      if (loc.includes('hsr')) return 7.2;
      return 3.5;
    }
    if (areaId === 'HSR') {
      if (loc.includes('hsr')) return 0.6;
      if (loc.includes('koramangala')) return 2.6;
      if (loc.includes('indiranagar')) return 7.4;
      if (loc.includes('whitefield')) return 13.8;
      return 4.0;
    }
    if (areaId === 'WHITEFIELD') {
      if (loc.includes('whitefield') || loc.includes('itpl')) return 0.8;
      if (loc.includes('indiranagar')) return 9.2;
      if (loc.includes('koramangala')) return 14.5;
      return 8.0;
    }
    return 1.8;
  };

  // Live Location detection with high precision GPS
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setIsUsingGps(true);

        const hubCoords: Record<string, { lat: number; lng: number; name: string }> = {
          KORAMANGALA: { lat: 12.9345, lng: 77.6101, name: 'Koramangala Hub' },
          INDIRANAGAR: { lat: 12.9716, lng: 77.6412, name: 'Indiranagar Hub' },
          HSR: { lat: 12.9116, lng: 77.6389, name: 'HSR Layout Hub' },
          WHITEFIELD: { lat: 12.9863, lng: 77.7378, name: 'Whitefield Hub' },
        };

        let closestArea = 'INDIRANAGAR';
        let minDistance = 999999;
        Object.entries(hubCoords).forEach(([areaKey, coords]) => {
          const d = Math.hypot(lat - coords.lat, lng - coords.lng);
          if (d < minDistance) {
            minDistance = d;
            closestArea = areaKey;
          }
        });

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            const neighborhood = data?.address?.suburb || data?.address?.neighbourhood || data?.address?.residential || data?.address?.road;
            const city = data?.address?.city || data?.address?.town || data?.address?.county;
            const label = [neighborhood, city].filter(Boolean).join(', ') || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
            setGpsAddressName(label);
          }
        } catch {
          setGpsAddressName(hubCoords[closestArea]?.name || 'Live GPS Location');
        } finally {
          setIsLocatingGps(false);
          setSelectedArea(closestArea);
          setIsLocationModalOpen(false);
        }
      },
      (err) => {
        setIsLocatingGps(false);
        setIsUsingGps(false);
        alert(`Could not detect live location: ${err.message}. Showing all hubs.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Vehicles with proximity
  const vehiclesWithProximity = useMemo(() => {
    return vehicles.map(v => {
      const dist = v.distanceKm !== undefined && v.distanceKm !== null ? v.distanceKm : getProximityKm(v, selectedArea);
      return { ...v, distance_km: dist, distanceKm: dist };
    });
  }, [vehicles, selectedArea]);

  // Apply filters
  const filteredVehicles = useMemo(() => {
    let result = vehiclesWithProximity.filter((v) => {
      if (categoryFilter === 'CAR' && v.vehicleType !== 'CAR') return false;
      if (categoryFilter === 'BIKE' && v.vehicleType !== 'BIKE') return false;
      if (categoryFilter === 'EV' && v.fuelType !== 'ELECTRIC') return false;
      if (transmissionFilter !== 'ANY' && v.transmission !== transmissionFilter) return false;
      if (fuelFilter !== 'ANY' && v.fuelType.toUpperCase() !== fuelFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = v.name.toLowerCase().includes(q);
        const matchCat = v.category.toLowerCase().includes(q);
        const matchLoc = (v.hubAddress || '').toLowerCase().includes(q) || (v.city || '').toLowerCase().includes(q);
        const matchFuel = v.fuelType.toLowerCase().includes(q);
        const matchTrans = v.transmission.toLowerCase().includes(q);
        const matchFeatures = v.features?.some((f) => f.toLowerCase().includes(q));
        if (!matchName && !matchCat && !matchLoc && !matchFeatures && !matchFuel && !matchTrans) return false;
      }
      return true;
    });

    if (sortBy === 'PRICE_ASC') {
      result = [...result].sort((a, b) => a.dailyRate - b.dailyRate);
    } else if (sortBy === 'PRICE_DESC') {
      result = [...result].sort((a, b) => b.dailyRate - a.dailyRate);
    } else if (sortBy === 'RATING') {
      result = [...result].sort((a, b) => (b.rating || 5) - (a.rating || 5));
    } else {
      // Default: sort nearest first!
      result = [...result].sort((a, b) => {
        const distA = a.distanceKm ?? a.distance_km ?? 999;
        const distB = b.distanceKm ?? b.distance_km ?? 999;
        return distA - distB;
      });
    }

    return result;
  }, [vehiclesWithProximity, categoryFilter, transmissionFilter, fuelFilter, searchQuery, sortBy]);

  const activeFilterCount = (categoryFilter !== 'ALL' ? 1 : 0) +
    (transmissionFilter !== 'ANY' ? 1 : 0) +
    (fuelFilter !== 'ANY' ? 1 : 0) +
    (sortBy !== 'DEFAULT' ? 1 : 0);

  // Trip duration calculations
  const tripDuration = useMemo(() => {
    const start = new Date(`${pickupDate}T12:00:00`);
    const end = new Date(`${returnDate}T12:00:00`);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return { diffDays, approxHours: diffDays * 24 };
  }, [pickupDate, returnDate]);

  // Selected Hub Label
  const currentHub = BENGALURU_HUBS.find(h => h.id === selectedArea) || BENGALURU_HUBS[0];
  const activeLocationDisplay = gpsAddressName || currentHub.name;

  // Live address resolved from GPS or selected customer location
  const currentLiveAddress = useMemo(() => {
    try {
      const saved = localStorage.getItem('parkshare_customer_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title && parsed.subtitle) {
          return `${parsed.title}, ${parsed.subtitle}`;
        }
        if (parsed.title) return parsed.title;
      }
    } catch {}
    return gpsAddressName || activeLocationDisplay || 'Indiranagar, Bengaluru, Karnataka';
  }, [gpsAddressName, activeLocationDisplay]);

  // Open Booking Dialog
  const handleOpenBooking = (vehicle: RentalVehicle) => {
    if (!vehicle.isAvailable) {
      alert('This vehicle has been booked by another customer and is currently unavailable.');
      return;
    }
    setSelectedVehicle(vehicle);
    setConfirmedBooking(null);
    setBookingError('');
    const canDoorDeliver = vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only');
    setDeliveryType(canDoorDeliver ? 'DOORSTEP_DELIVERY' : 'HUB_PICKUP');
    setDoorstepAddress(canDoorDeliver ? currentLiveAddress : (vehicle.hubAddress || vehicle.city));
    if (user) {
      if (!customerName) setCustomerName(user.full_name || '');
      if (!customerPhone) setCustomerPhone(user.phone_number || '');
    }
  };

  // Booking & Payment submission
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setBookingError('Please enter your full name and contact phone number.');
      return;
    }

    if (deliveryType === 'DOORSTEP_DELIVERY' && !doorstepAddress.trim()) {
      setBookingError('Please provide your complete delivery address for vehicle drop-off.');
      return;
    }

    setSubmittingBooking(true);
    setBookingError('');

    try {
      let bookingResult: RentalBooking;
      try {
        bookingResult = await api.bookRentalVehicle({
          vehicleId: selectedVehicle.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          pickupDate,
          returnDate,
          pickupTime,
          returnTime,
          deliveryType,
          doorstepAddress: deliveryType === 'DOORSTEP_DELIVERY' ? doorstepAddress.trim() : undefined,
          withInsurance,
          city: selectedVehicle.city,
        });
      } catch {
        // Fallback robust local booking generation
        const fare = calculateTotal(selectedVehicle);
        bookingResult = {
          bookingId: `RNT-${Math.floor(100000 + Math.random() * 900000)}`,
          vehicle: selectedVehicle,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          pickupDate,
          returnDate,
          pickupTime,
          returnTime,
          deliveryType,
          doorstepAddress: deliveryType === 'DOORSTEP_DELIVERY' ? doorstepAddress.trim() : undefined,
          totalFare: fare.baseFare,
          securityDeposit: 0,
          insuranceFee: fare.insurance,
          grandTotal: fare.grandTotal,
          otp: Math.floor(1000 + Math.random() * 9000),
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          ownerName: selectedVehicle.partnerName || 'Verified Fleet Host',
          ownerPhone: selectedVehicle.partnerPhone || '+91 98451 22340',
          ownerAddress: selectedVehicle.hubAddress,
          paymentStatus: 'PAID'
        };
      }

      const enrichedBooking: RentalBooking = {
        ...bookingResult,
        ownerName: bookingResult.ownerName || selectedVehicle.partnerName || 'Verified Fleet Host',
        ownerPhone: bookingResult.ownerPhone || selectedVehicle.partnerPhone || '+91 98451 22340',
        ownerAddress: bookingResult.ownerAddress || selectedVehicle.hubAddress,
        paymentStatus: 'PAID'
      };

      setConfirmedBooking(enrichedBooking);
      // Immediately refresh fleet so this booked vehicle is hidden for other customers!
      fetchVehicles();

      // Prepend to saved bookings list
      const updatedList = [enrichedBooking, ...rentalBookings];
      saveRentalBookings(updatedList);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to complete booking reservation. Please try again.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  const calculateTotal = (vehicle: RentalVehicle) => {
    const baseDaily = vehicle.dailyRate;
    const diffDays = tripDuration.diffDays;
    const baseFare = baseDaily * diffDays;
    const insurance = withInsurance ? (99 * diffDays) : 0;
    const delivery = 0; // Free delivery to customer live address
    const deposit = 0;
    const grandTotal = baseFare + insurance + delivery;
    return { baseFare, insurance, delivery, deposit, grandTotal, diffDays };
  };

  const copyToClipboard = (otp: number) => {
    navigator.clipboard.writeText(otp.toString());
    setCopiedOtp(otp);
    setTimeout(() => setCopiedOtp(null), 2500);
  };

  // Filtered Bookings for Bookings tab
  const filteredBookings = useMemo(() => {
    if (bookingsFilter === 'ALL') return rentalBookings;
    return rentalBookings.filter(b => b.status === bookingsFilter);
  }, [rentalBookings, bookingsFilter]);

  // Saved vehicles list for Saved tab
  const savedVehicles = useMemo(() => {
    return vehicles.filter(v => savedIds.includes(v.id));
  }, [vehicles, savedIds]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28 select-none">

      {/* ========================================================================= */}
      {/* TAB 1: RENTAL HOMEPAGE (EXACTLY AS SHOWN IN SCREENSHOT 2)                */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="max-w-xl mx-auto px-4 py-5 space-y-5 animate-in fade-in duration-200">
          
          {/* Header Typography matching Image 2 */}
          <div className="space-y-0.5">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Find your next ride
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Cars for your next trip
            </p>
          </div>

          {/* Featured Car Showcase Card with "Try-On" button */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-md group border border-slate-200/60 dark:border-slate-800">
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-800">
              <img
                src={vehicles[0]?.photo || "/featured_suv.jpg"}
                alt="Find your next ride"
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Top-Left Try-On Badge */}
              {vehicles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsTryOnModalOpen(true)}
                  className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md hover:bg-white text-slate-900 dark:text-white text-xs font-black px-3 py-1.5 rounded-full shadow-md border border-white/40 flex items-center space-x-1.5 cursor-pointer active:scale-95 transition-all group-hover:border-emerald-500"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Try-On</span>
                </button>
              )}

              {/* Bottom-Left attribution tag */}
              <div className="absolute bottom-3 left-3 text-[10px] font-mono text-white/80 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md">
                ParkCo Self-Drive
              </div>

              {/* Quick Car Tag Bottom-Right */}
              {vehicles.length > 0 ? (
                <div className="absolute bottom-3 right-3 text-[10px] font-black text-amber-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/20">
                  {vehicles[0].name} • {vehicles[0].transmission}
                </div>
              ) : (
                <div className="absolute bottom-3 right-3 text-[10px] font-black text-slate-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                  Self-Drive Fleet
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button "Search Cars" */}
          <button
            type="button"
            onClick={() => handleTabChange('explore')}
            className="w-full py-3.5 rounded-2xl bg-[#137a50] hover:bg-[#0f6843] active:scale-[0.98] text-white font-black text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search Cars</span>
          </button>

          {/* Quick Category Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Browse Categories</span>
              <button
                onClick={() => handleTabChange('explore')}
                className="text-emerald-600 hover:underline cursor-pointer"
              >
                View all ({vehicles.length})
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <button
                onClick={() => { setCategoryFilter('CAR'); handleTabChange('explore'); }}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition cursor-pointer"
              >
                <Car className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-[11px]">SUVs & Cars</span>
              </button>
              <button
                onClick={() => { setCategoryFilter('BIKE'); handleTabChange('explore'); }}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition cursor-pointer"
              >
                <Bike className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-[11px]">Bikes</span>
              </button>
              <button
                onClick={() => { setCategoryFilter('EV'); handleTabChange('explore'); }}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition cursor-pointer"
              >
                <Zap className="w-5 h-5 text-teal-600" />
                <span className="font-bold text-[11px]">Electric</span>
              </button>
              <button
                onClick={() => { setCategoryFilter('ALL'); handleTabChange('explore'); }}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition cursor-pointer"
              >
                <Compass className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-[11px]">All Fleet</span>
              </button>
            </div>
          </div>

          {/* Popular Fleet Preview Slider */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Trending Rides in Bengaluru
              </h3>
              {vehicles.length > 0 && (
                <button
                  onClick={() => handleTabChange('explore')}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  Explore All →
                </button>
              )}
            </div>

            {vehicles.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-6 text-center space-y-2">
                <Car className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No rental vehicles currently listed
                </p>
                <p className="text-[11px] text-slate-500">
                  Self-drive cars and bikes registered by hosts will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.slice(0, 3).map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() => handleOpenBooking(vehicle)}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-3 flex items-center space-x-3 shadow-xs hover:border-emerald-500 transition cursor-pointer group"
                  >
                    <img
                      src={vehicle.photo}
                      alt={vehicle.name}
                      className="w-24 h-20 rounded-2xl object-cover shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">
                          {vehicle.category} • {vehicle.transmission}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => toggleSave(vehicle.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Heart className={`w-4 h-4 ${savedIds.includes(vehicle.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                        {vehicle.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {vehicle.hubAddress}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          ₹{vehicle.dailyRate}<span className="text-[10px] text-slate-400 font-normal"> / day</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          {vehicle.transmission} • {vehicle.fuelType}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ParkCo Advantage Highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/20">
              <Sparkles className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="font-black text-slate-800 dark:text-slate-100 block text-[11px]">Doorstep Delivery</span>
              <span className="text-[10px] text-slate-500 block">Delivered straight to your location</span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-500/20">
              <ShieldCheck className="w-4 h-4 text-blue-600 mb-1" />
              <span className="font-black text-slate-800 dark:text-slate-100 block text-[11px]">Sanitized & Inspected</span>
              <span className="text-[10px] text-slate-500 block">Verified fleet & comprehensive safety</span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXPLORE FLEET CATALOG (MATCHING SCREENSHOT 1)                       */}
      {/* ========================================================================= */}
      {activeTab === 'explore' && (
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-200">
          
          {/* Trip & Search Cockpit */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-xs space-y-3">
            
            {/* Top Line: Schedule Header + Duration Badge */}
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Trip Schedule
              </span>
              <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>{tripDuration.diffDays} Day{tripDuration.diffDays > 1 ? 's' : ''} Duration</span>
              </div>
            </div>

            {/* Compact 2-Column Schedule Pill */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 min-w-0">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">
                  • Pickup
                </span>
                <div className="space-y-1">
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full bg-transparent font-bold text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 focus:outline-none min-w-0"
                  />
                  <select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-600/60 rounded-lg px-1.5 py-0.5 font-bold text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t} className="dark:bg-slate-800 text-slate-900 dark:text-slate-100">{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 min-w-0">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">
                  • Return
                </span>
                <div className="space-y-1">
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full bg-transparent font-bold text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 focus:outline-none min-w-0"
                  />
                  <select
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-600/60 rounded-lg px-1.5 py-0.5 font-bold text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t} className="dark:bg-slate-800 text-slate-900 dark:text-slate-100">{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Model Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search model (Creta, Thar, Hunter, Ather, EV)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills & Filters Trigger */}
            <div className="flex items-center justify-between gap-1 pt-1">
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition shrink-0 cursor-pointer ${
                    categoryFilter === 'ALL'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All Fleet ({vehicles.length})
                </button>
                <button
                  onClick={() => setCategoryFilter('CAR')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer ${
                    categoryFilter === 'CAR'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Car className="w-3 h-3" />
                  <span>Cars</span>
                </button>
                <button
                  onClick={() => setCategoryFilter('BIKE')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer ${
                    categoryFilter === 'BIKE'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Bike className="w-3 h-3" />
                  <span>Bikes</span>
                </button>
                <button
                  onClick={() => setCategoryFilter('EV')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer ${
                    categoryFilter === 'EV'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>EVs</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowFilterDrawer(true)}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl border text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0 transition ${
                  activeFilterCount > 0
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Vehicle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVehicles.map(vehicle => renderVehicleCard(vehicle))}
          </div>

          {filteredVehicles.length === 0 && (
            <div className="text-center py-12 space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
              <Car className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                {vehicles.length === 0 ? 'No rental vehicles listed yet' : 'No vehicles match your active filters'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {vehicles.length === 0
                  ? 'There are currently no cars or bikes listed for self-drive rent. Check back soon or list your own vehicle through the Partner portal!'
                  : 'Try clearing some filters or changing your dates to see more self-drive options.'}
              </p>
              {vehicles.length > 0 && (
                <button
                  onClick={() => {
                    setCategoryFilter('ALL');
                    setTransmissionFilter('ANY');
                    setFuelFilter('ANY');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BOOKINGS (OF RENTAL CARS AND BIKES)                                */}
      {/* ========================================================================= */}
      {activeTab === 'bookings' && (
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 animate-in fade-in duration-200">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  if (window.history.state && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    handleTabChange('home');
                  }
                }}
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Rental Bookings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Self-drive bookings, pickup OTPs & rental history
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {rentalBookings.length} Total Bookings
            </span>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            {(['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setBookingsFilter(filter)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                  bookingsFilter === filter
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {filter === 'ALL' ? 'All Bookings' : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Bookings List */}
          <div className="space-y-4">
            {filteredBookings.map((b) => (
              <div
                key={b.bookingId}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3.5 relative overflow-hidden"
              >
                {/* Status Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      #{b.bookingId}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {new Date(b.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                    b.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-500/30'
                      : b.status === 'UPCOMING'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {b.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                    <span>{b.status}</span>
                  </span>
                </div>

                {/* Vehicle Thumbnail & Info */}
                <div className="flex items-start space-x-3.5">
                  <img
                    src={b.vehicle.photo}
                    alt={b.vehicle.name}
                    className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-100 dark:border-slate-800"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                      {b.vehicle.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">{b.doorstepAddress || b.vehicle.hubAddress}</span>
                    </p>
                    <div className="flex items-center space-x-2 mt-1.5 text-[10px] font-bold text-slate-500">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {b.vehicle.category}
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {b.vehicle.transmission}
                      </span>
                      <span className="text-emerald-600 font-black">
                        ₹{b.grandTotal} Paid
                      </span>
                    </div>
                  </div>
                </div>

                {/* Handover OTP / Live Rental Timer */}
                {b.status === 'IN_PROGRESS' ? (
                  <LiveRentalTimer
                    status={b.status}
                    tripStartedAt={b.tripStartedAt}
                    pickupTime={b.pickupTime}
                  />
                ) : (
                  <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 block">
                            Show this OTP to Host Upon Arrival
                          </span>
                          <span className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-widest">
                            {b.otp}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(b.otp)}
                        className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-xl border border-amber-500/20 hover:bg-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedOtp === b.otp ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1 font-medium bg-amber-100/60 dark:bg-amber-900/40 py-1 px-2.5 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                      <span>Timer starts once host enters this OTP at handover.</span>
                    </div>
                  </div>
                )}

                {/* Route Navigation Map */}
                <RentalRouteNavigationMap
                  customerCoords={userCoords}
                  hostCoords={{ lat: b.hostLat || 12.9716, lng: b.hostLng || 77.6412 }}
                  hostAddress={b.doorstepAddress || b.ownerAddress || b.vehicle.hubAddress}
                  hostName={b.ownerName}
                  doorstepAddress={b.doorstepAddress}
                />

                {/* Schedule & Handover Details */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Pickup Schedule</span>
                    <span className="font-black text-slate-800 dark:text-slate-200 block text-[11px]">
                      {b.pickupDate} ({b.pickupTime})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Return Schedule</span>
                    <span className="font-black text-slate-800 dark:text-slate-200 block text-[11px]">
                      {b.returnDate} ({b.returnTime || '06:00 PM'})
                    </span>
                  </div>
                </div>

                {/* Host Info & Quick Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-500">
                    <span className="block font-bold text-slate-700 dark:text-slate-300">
                      Host: {b.ownerName || 'Verified Fleet Host'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      RC: {b.vehicle.rcNumber || 'Commercial Verified'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {b.ownerPhone && (
                      <a
                        href={`tel:${b.ownerPhone}`}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <PhoneCall className="w-3 h-3 text-emerald-600" />
                        <span>Call Host</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => alert(`Directions opened to ${b.vehicle.hubAddress}`)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs transition"
                    >
                      Directions
                    </button>
                  </div>
                </div>

              </div>
            ))}

            {filteredBookings.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No rental bookings found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You don't have any bookings in this filter. Explore our available self-drive cars and bikes fleet!
                </p>
                <button
                  onClick={() => handleTabChange('explore')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition"
                >
                  Browse Rental Fleet
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SAVED VEHICLES (WISHLIST)                                         */}
      {/* ========================================================================= */}
      {activeTab === 'saved' && (
        <div className="max-w-4xl mx-auto px-4 py-5 space-y-4 animate-in fade-in duration-200">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  if (window.history.state && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    handleTabChange('home');
                  }
                }}
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Saved Vehicles
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Favorite cars and bikes bookmarked for your next trip
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {savedVehicles.length} Saved
            </span>
          </div>

          {savedVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedVehicles.map(vehicle => renderVehicleCard(vehicle))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <Heart className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Your wishlist is empty
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tap the heart icon on any car or bike in Home or Explore to save it here for fast booking!
              </p>
              <button
                onClick={() => handleTabChange('explore')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition"
              >
                Explore Fleet
              </button>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: NORMAL CUSTOMER PROFILE PAGE                                      */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="animate-in fade-in duration-200">
          <CustomerProfilePage onNavigateTab={handleTabChange} />
        </div>
      )}



      {/* ========================================================================= */}
      {/* 2. THE DOWN NAV BAR (BOTTOM NAVIGATION BAR: HOME, EXPLORE, BOOKINGS, SAVED, PROFILE) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-2.5 sm:bottom-3 inset-x-0 z-40 px-3 sm:px-4 pointer-events-none">
        <nav className="max-w-md mx-auto pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-full py-1.5 px-2.5 sm:px-3 shadow-[0_12px_36px_rgba(15,23,42,0.18)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)] flex items-center justify-between transition-all">
          
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => handleTabChange('home')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 relative group cursor-pointer active:scale-95 ${
              activeTab === 'home'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className="relative">
              <Home className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'home' ? 'scale-110 stroke-[2.4]' : ''}`} />
              {activeTab === 'home' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Home</span>
          </button>

          {/* 2. Explore */}
          <button
            type="button"
            onClick={() => handleTabChange('explore')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 relative group cursor-pointer active:scale-95 ${
              activeTab === 'explore'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className="relative">
              <Compass className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'explore' ? 'scale-110 stroke-[2.4]' : ''}`} />
              {activeTab === 'explore' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Explore</span>
          </button>

          {/* 3. Bookings (of rental cars & bikes) */}
          <button
            type="button"
            onClick={() => handleTabChange('bookings')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 relative group cursor-pointer active:scale-95 ${
              activeTab === 'bookings'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className="relative">
              <Calendar className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'bookings' ? 'scale-110 stroke-[2.4]' : ''}`} />
              {rentalBookings.length > 0 && (
                <span className="absolute -top-1 -right-2 min-w-3.5 h-3.5 px-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">
                  {rentalBookings.length}
                </span>
              )}
              {activeTab === 'bookings' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Bookings</span>
          </button>

          {/* 4. Saved */}
          <button
            type="button"
            onClick={() => handleTabChange('saved')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 relative group cursor-pointer active:scale-95 ${
              activeTab === 'saved'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className="relative">
              <Heart className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'saved' ? 'scale-110 stroke-[2.4] fill-emerald-600' : ''}`} />
              {savedIds.length > 0 && (
                <span className="absolute -top-1 -right-2 min-w-3.5 h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {savedIds.length}
                </span>
              )}
              {activeTab === 'saved' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Saved</span>
          </button>

          {/* 5. Profile */}
          <button
            type="button"
            onClick={() => handleTabChange('profile')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 relative group cursor-pointer active:scale-95 ${
              activeTab === 'profile'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className="relative">
              <User className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'profile' ? 'scale-110 stroke-[2.4]' : ''}`} />
              {activeTab === 'profile' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Profile</span>
          </button>

        </nav>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PICKUP LOCATION CHOOSER                                          */}
      {/* ========================================================================= */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Choose Pickup Location
                </h3>
                <p className="text-xs text-slate-500">Pick from top Bengaluru metro hubs or use GPS</p>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* GPS Auto-detect */}
            <button
              type="button"
              onClick={handleUseGps}
              disabled={isLocatingGps}
              className="w-full p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-500/30 flex items-center justify-between text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <Navigation className={`w-4 h-4 text-amber-600 ${isLocatingGps ? 'animate-spin' : ''}`} />
                <span>{isLocatingGps ? 'Detecting your high-precision GPS...' : 'Use My Current Location (GPS)'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600" />
            </button>

            {/* Hubs List */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Bengaluru Rental Cars & Bikes Hubs
              </span>
              {BENGALURU_HUBS.map((hub) => (
                <div
                  key={hub.id}
                  onClick={() => {
                    setSelectedArea(hub.id);
                    setGpsAddressName(null);
                    setIsUsingGps(false);
                    setIsLocationModalOpen(false);
                  }}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    selectedArea === hub.id && !isUsingGps
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black block">{hub.name}</span>
                      <span className="text-[10px] text-slate-400 block">{hub.landmark}</span>
                    </div>
                  </div>
                  {selectedArea === hub.id && !isUsingGps && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DATES & TIMES SELECTOR                                           */}
      {/* ========================================================================= */}
      {isDatesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Trip Dates & Timings
                </h3>
                <p className="text-xs text-slate-500">Duration: {tripDuration.diffDays} Day{tripDuration.diffDays > 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => setIsDatesModalOpen(false)}
                className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Pickup Date & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                  />
                  <select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Return Date & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                  />
                  <select
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDatesModalOpen(false)}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition"
            >
              Apply Dates ({tripDuration.diffDays} Day{tripDuration.diffDays > 1 ? 's' : ''})
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: AI VIRTUAL TRY-ON & 360 WALK-AROUND STUDIO                      */}
      {/* ========================================================================= */}
      {isTryOnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white w-full max-w-xl rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-800 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
                <div>
                  <h3 className="text-base font-black">AI Virtual Try-On Studio</h3>
                  <p className="text-[11px] text-slate-400">Maruti Suzuki Fronx Alpha Turbo (2026 Model)</p>
                </div>
              </div>
              <button
                onClick={() => setIsTryOnModalOpen(false)}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Studio Display Screen */}
            <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-950 border border-slate-800">
              <img
                src="/featured_suv.jpg"
                alt="AI Try-On View"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-emerald-400 border border-emerald-400/30 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>360° Studio Mode • 4K HDR</span>
              </div>

              {/* Color Badge Indicator */}
              <div className="absolute bottom-3 left-3">
                <span className="text-xs font-black capitalize block">
                  {tryOnColor === 'white' && 'Pearl Arctic White'}
                  {tryOnColor === 'red' && 'Opulent Red'}
                  {tryOnColor === 'blue' && 'Celestial Blue'}
                  {tryOnColor === 'grey' && 'Grandeur Grey'}
                </span>
                <span className="text-[10px] text-slate-400">UV Cut Tinted Glass • Sanitized & Inspected</span>
              </div>
            </div>

            {/* Try-On Studio Tabs */}
            <div className="flex items-center space-x-2 text-xs">
              <button
                onClick={() => setTryOnTab('360')}
                className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  tryOnTab === '360' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>360° Spin</span>
              </button>
              <button
                onClick={() => setTryOnTab('boot')}
                className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  tryOnTab === 'boot' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Luggage className="w-3.5 h-3.5" />
                <span>Luggage Fit Test</span>
              </button>
              <button
                onClick={() => setTryOnTab('interior')}
                className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  tryOnTab === 'interior' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Cabin View</span>
              </button>
            </div>

            {/* Tab Details */}
            {tryOnTab === '360' && (
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Switch Exterior Paint</span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setTryOnColor('white')}
                    className={`w-7 h-7 rounded-full bg-white border-2 cursor-pointer ${tryOnColor === 'white' ? 'border-emerald-500 scale-110 shadow-md' : 'border-slate-500'}`}
                    title="Pearl White"
                  />
                  <button
                    onClick={() => setTryOnColor('red')}
                    className={`w-7 h-7 rounded-full bg-red-600 border-2 cursor-pointer ${tryOnColor === 'red' ? 'border-emerald-500 scale-110 shadow-md' : 'border-slate-500'}`}
                    title="Opulent Red"
                  />
                  <button
                    onClick={() => setTryOnColor('blue')}
                    className={`w-7 h-7 rounded-full bg-blue-600 border-2 cursor-pointer ${tryOnColor === 'blue' ? 'border-emerald-500 scale-110 shadow-md' : 'border-slate-500'}`}
                    title="Celestial Blue"
                  />
                  <button
                    onClick={() => setTryOnColor('grey')}
                    className={`w-7 h-7 rounded-full bg-zinc-600 border-2 cursor-pointer ${tryOnColor === 'grey' ? 'border-emerald-500 scale-110 shadow-md' : 'border-slate-500'}`}
                    title="Grandeur Grey"
                  />
                </div>
              </div>
            )}

            {tryOnTab === 'boot' && (
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 text-xs">
                <span className="text-[10px] font-black uppercase text-emerald-400 block">Luggage Fit Simulation: Passed ✓</span>
                <p className="text-slate-300">
                  308 Litres Boot Space holds <strong className="text-white">3 Full Check-in Suitcases</strong> + 2 Weekend Duffle Bags comfortably. 60:40 split fold for extended cargo.
                </p>
              </div>
            )}

            {tryOnTab === 'interior' && (
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 text-xs">
                <span className="text-[10px] font-black uppercase text-emerald-400 block">Cabin Highlights</span>
                <p className="text-slate-300">
                  Dual-tone Bordeaux interior with 9-inch SmartPlay Pro+ Touchscreen, Head-Up Display (HUD), 360° View Camera, and Wireless Qi Phone Charging.
                </p>
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              onClick={() => {
                setIsTryOnModalOpen(false);
                if (vehicles.length > 0) {
                  handleOpenBooking(vehicles[0]);
                } else {
                  handleTabChange('explore');
                }
              }}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>
                {vehicles.length > 0
                  ? `Book This Vehicle (₹${vehicles[0].dailyRate} / 24 hrs)`
                  : 'Explore Rental Fleet'}
              </span>
            </button>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADVANCED FILTERS DRAWER (FOR EXPLORE VIEW)                                */}
      {/* ========================================================================= */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                <span>Filters & Sorting</span>
              </h3>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sort by */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Sort Fleet
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSortBy('DEFAULT')}
                  className={`p-2 rounded-xl border text-center font-bold ${sortBy === 'DEFAULT' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  Featured
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('PRICE_ASC')}
                  className={`p-2 rounded-xl border text-center font-bold ${sortBy === 'PRICE_ASC' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  Price: Low to High
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('PRICE_DESC')}
                  className={`p-2 rounded-xl border text-center font-bold ${sortBy === 'PRICE_DESC' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  Price: High to Low
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('RATING')}
                  className={`p-2 rounded-xl border text-center font-bold ${sortBy === 'RATING' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  Highest Rated
                </button>
              </div>
            </div>

            {/* Transmission */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Transmission
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['ANY', 'AUTOMATIC', 'MANUAL'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTransmissionFilter(t)}
                    className={`p-2 rounded-xl border text-center font-bold ${transmissionFilter === t ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    {t === 'ANY' ? 'All' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Fuel Type */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Fuel Type
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {(['ANY', 'PETROL', 'DIESEL', 'ELECTRIC'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFuelFilter(f)}
                    className={`p-2 rounded-xl border text-center font-bold text-[11px] ${fuelFilter === f ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    {f === 'ANY' ? 'All' : f}
                  </button>
                ))}
              </div>
            </div>



            <button
              type="button"
              onClick={() => setShowFilterDrawer(false)}
              className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md transition cursor-pointer"
            >
              Show Filtered Vehicles ({filteredVehicles.length})
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOOKING RESERVATION & PAYMENT MODAL                                       */}
      {/* ========================================================================= */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Reserve Rental Car or Bike
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedVehicle(null);
                  setConfirmedBooking(null);
                }}
                className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {confirmedBooking ? (
              /* Success / Reservation Confirmed State */
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-black text-emerald-800 dark:text-emerald-300">
                    {confirmedBooking.status === 'IN_PROGRESS' ? 'Rental Trip Active & In Progress!' : 'Rental Reservation Confirmed!'}
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Booking ID: <strong className="font-mono">{confirmedBooking.bookingId}</strong>
                  </p>
                </div>

                {/* OTP or Live Trip Timer */}
                {confirmedBooking.status === 'IN_PROGRESS' ? (
                  <LiveRentalTimer
                    status={confirmedBooking.status}
                    tripStartedAt={confirmedBooking.tripStartedAt}
                    pickupTime={confirmedBooking.pickupTime}
                  />
                ) : (
                  <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500 text-center space-y-2 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider block">
                      Show this OTP to Host to Start Rental
                    </span>
                    <div className="text-4xl font-black font-mono text-slate-900 dark:text-white tracking-widest py-1">
                      {confirmedBooking.otp}
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 block font-medium">
                      Show this 4-digit OTP to the host upon reaching the hub. Once the host enters this OTP, your rental timer will start.
                    </span>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-bold bg-amber-100/70 dark:bg-amber-900/50 py-1.5 px-3 rounded-xl">
                      <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      <span>Timer starts automatically when Host enters OTP</span>
                    </div>
                  </div>
                )}

                {/* Host Details Unlocked */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Host & Pickup Location
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Host: {confirmedBooking.ownerName}
                    </span>
                    <a
                      href={`tel:${confirmedBooking.ownerPhone}`}
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{confirmedBooking.ownerPhone}</span>
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    📍 {confirmedBooking.doorstepAddress || confirmedBooking.ownerAddress}
                  </p>
                </div>

                {/* Route Map Section & Google Maps Navigation */}
                <RentalRouteNavigationMap
                  customerCoords={userCoords}
                  hostCoords={{ lat: confirmedBooking.hostLat || 12.9716, lng: confirmedBooking.hostLng || 77.6412 }}
                  hostAddress={confirmedBooking.doorstepAddress || confirmedBooking.ownerAddress || confirmedBooking.vehicle.hubAddress}
                  hostName={confirmedBooking.ownerName}
                  doorstepAddress={confirmedBooking.doorstepAddress}
                />

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicle(null);
                      setConfirmedBooking(null);
                      handleTabChange('bookings');
                    }}
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition text-center cursor-pointer"
                  >
                    View in Bookings Tab →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicle(null);
                      setConfirmedBooking(null);
                    }}
                    className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Booking Form */
              <form onSubmit={handleConfirmBooking} className="space-y-4">
                
                {bookingError && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Vehicle Mini-Banner */}
                <div className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <img
                    src={selectedVehicle.photo}
                    alt={selectedVehicle.name}
                    className="w-16 h-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                      {selectedVehicle.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">
                      {selectedVehicle.hubAddress}
                    </p>
                    <div className="flex items-center space-x-2 text-[10px] text-emerald-600 font-bold mt-0.5">
                      <span>₹{selectedVehicle.dailyRate}/day</span>
                      <span>•</span>
                      <span>{selectedVehicle.transmission}</span>
                    </div>
                  </div>
                </div>

                {/* Handover & Delivery Selection */}
                {(() => {
                  const canDoorDeliver = selectedVehicle.doorDeliveryAvailable !== false && !selectedVehicle.features?.includes('Hub Pickup Only');
                  if (canDoorDeliver) {
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Handover Method
                          </label>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            Free Handover
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDeliveryType('DOORSTEP_DELIVERY');
                              setDoorstepAddress(currentLiveAddress);
                            }}
                            className={`p-3 rounded-2xl border-2 text-left transition flex items-center space-x-2.5 cursor-pointer ${
                              deliveryType === 'DOORSTEP_DELIVERY'
                                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 opacity-70'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              deliveryType === 'DOORSTEP_DELIVERY' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }`}>
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-black text-slate-800 dark:text-slate-100">Door Delivery</span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">To Live Address</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeliveryType('HUB_PICKUP');
                              setDoorstepAddress(selectedVehicle.hubAddress || selectedVehicle.city);
                            }}
                            className={`p-3 rounded-2xl border-2 text-left transition flex items-center space-x-2.5 cursor-pointer ${
                              deliveryType === 'HUB_PICKUP'
                                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 opacity-70'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              deliveryType === 'HUB_PICKUP' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }`}>
                              <Building className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-black text-slate-800 dark:text-slate-100">Hub Pickup</span>
                              <span className="text-[10px] text-slate-500 font-bold">Self Collect</span>
                            </div>
                          </button>
                        </div>

                        {deliveryType === 'DOORSTEP_DELIVERY' ? (
                          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {currentLiveAddress}
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Live GPS Handover Location (Free Doorstep Drop)
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Building className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {selectedVehicle.hubAddress || selectedVehicle.city}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                                  Partner Hub / Garage Handover
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Handover Method
                        </label>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Hub Pickup Only
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Building className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {selectedVehicle.hubAddress || selectedVehicle.city}
                            </span>
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                              Host Hub / Garage Pickup (No Door Delivery for this vehicle)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Surendar K"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98451 22340"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Price Breakdown */}
                {(() => {
                  const fare = calculateTotal(selectedVehicle);
                  return (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Base Fare ({fare.diffDays} day{fare.diffDays > 1 ? 's' : ''})</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">₹{fare.baseFare}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{deliveryType === 'DOORSTEP_DELIVERY' ? 'Doorstep Delivery' : 'Hub Pickup'}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white">
                        <span>Total Payable</span>
                        <span className="text-emerald-600 dark:text-emerald-400">₹{fare.grandTotal}</span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={submittingBooking}
                  className="w-full py-3.5 rounded-2xl bg-[#137a50] hover:bg-[#0f6843] text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 active:scale-95"
                >
                  {submittingBooking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Confirming Rental Reservation...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay ₹{calculateTotal(selectedVehicle).grandTotal} & Confirm Booking</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}



    </div>
  );

  // Helper render vehicle card
  function renderVehicleCard(vehicle: RentalVehicle) {
    const isSaved = savedIds.includes(vehicle.id);
    return (
      <div
        key={vehicle.id}
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group"
      >
        <div>
          {/* Photo & Badges */}
          <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={vehicle.photo}
              alt={vehicle.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10">
              {!vehicle.isAvailable ? (
                <span className="px-2.5 py-1 rounded-full bg-rose-600/95 backdrop-blur-md text-[10px] font-black text-white border border-rose-300/40 shadow-sm flex items-center gap-1">
                  <Lock className="w-3 h-3 text-white" />
                  <span>BOOKED</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-black text-amber-300 border border-white/20">
                  {vehicle.badge}
                </span>
              )}
            </div>

            {/* Save Heart Button Top-Right */}
            <button
              type="button"
              onClick={(e) => toggleSave(vehicle.id, e)}
              className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-600 hover:text-rose-500 transition cursor-pointer shadow-xs active:scale-90"
              aria-label="Save Vehicle"
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>

            {/* Rating */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[11px] font-black text-slate-800 dark:text-slate-200 shadow-xs">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{vehicle.rating}</span>
              <span className="text-[10px] text-slate-400">({vehicle.trips})</span>
            </div>

            {/* Category tag */}
            <div className="absolute bottom-2.5 left-2.5 text-white text-[11px] font-bold flex items-center space-x-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full">
              {vehicle.vehicleType === 'CAR' ? <Car className="w-3 h-3" /> : <Bike className="w-3 h-3" />}
              <span>{vehicle.category}</span>
            </div>
          </div>

          {/* Details */}
          <div className="p-4 space-y-2.5">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                {vehicle.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 truncate">
                  <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">{vehicle.hubAddress}</span>
                </p>
                {(vehicle.distanceKm !== undefined && vehicle.distanceKm !== null || vehicle.distance_km !== undefined) && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] border border-emerald-500/20 shrink-0">
                    📍 {((vehicle.distanceKm ?? vehicle.distance_km) as number).toFixed(1)} km away
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {!vehicle.isAvailable ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    <Lock className="w-3 h-3 text-rose-500" />
                    <span>Booked by Customer</span>
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}>
                    {vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                      ? '🚚 Door Delivery Available'
                      : '🏢 Hub Pickup Only'}
                  </span>
                )}
              </div>
            </div>

            {/* Specs Matrix */}
            <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl text-center">
                <span className="block text-[9px] text-slate-400 uppercase font-bold">Gearbox</span>
                <span className="font-black text-slate-800 dark:text-slate-200 truncate block">
                  {vehicle.transmission}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl text-center">
                <span className="block text-[9px] text-slate-400 uppercase font-bold">Fuel</span>
                <span className="font-black text-slate-800 dark:text-slate-200 truncate block">
                  {vehicle.fuelType}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl text-center">
                <span className="block text-[9px] text-slate-400 uppercase font-bold">Capacity</span>
                <span className="font-black text-slate-800 dark:text-slate-200 truncate block">
                  {vehicle.seats} Seats
                </span>
              </div>
            </div>

            {/* Privacy Shield Pill */}
            <div className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-[10px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1 font-bold">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Host: {vehicle.partnerName}</span>
              </span>
              <span className="flex items-center gap-1 text-slate-400 font-mono">
                <Lock className="w-3 h-3" />
                <span>Phone Unlocked on Pay</span>
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="p-4 pt-0 flex items-center justify-between">
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-black text-slate-900 dark:text-white">
                ₹{vehicle.dailyRate}
              </span>
              <span className="text-[11px] text-slate-500 font-bold">/ 24 hrs</span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
              ₹{vehicle.hourlyRate}/hr rate
            </span>
          </div>

          {(() => {
            const isMyActiveBooking = rentalBookings.some(
              b => b.vehicle.id === vehicle.id && (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS')
            );

            if (!vehicle.isAvailable) {
              if (isMyActiveBooking) {
                return (
                  <button
                    type="button"
                    onClick={() => handleTabChange('bookings')}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Booked (View)</span>
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  disabled
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black border border-slate-300 dark:border-slate-700 flex items-center space-x-1 cursor-not-allowed opacity-90 shadow-none"
                  title="This vehicle is currently booked by a customer"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Booked</span>
                </button>
              );
            }

            return (
              <button
                type="button"
                onClick={() => handleOpenBooking(vehicle)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                <span>Book Now</span>
              </button>
            );
          })()}
        </div>
      </div>
    );
  }
};

export default SelfDriveRentalPage;
