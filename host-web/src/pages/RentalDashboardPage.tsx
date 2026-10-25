import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import L from 'leaflet';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RentalPartnerVehicle } from '../types';
import { LiveVehicleTrackerModal } from '../components/LiveVehicleTrackerModal';
import { PartnerLocationHeader } from '../components/PartnerLocationHeader';
import {
  Car,
  Bike,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Star,
  MapPin,
  ShieldCheck,
  Fuel,
  IndianRupee,
  KeyRound,
  ArrowLeft,
  Sliders,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Calendar,
  Phone,
  UserCheck,
  Check,
  X,
  Layers,
  Settings,
  Zap,
  Info,
  Navigation,
  Radio,
  Shield,
  Gauge,
  LayoutGrid,
  Wallet,
  User,
  Bell,
  Trash2,
  LogOut,
  SlidersHorizontal,
  Search,
  ArrowUpRight,
  Award,
  Activity,
  ArrowRight
} from 'lucide-react';

interface MockRentalBooking {
  id: string;
  vehicleId: string;
  vehicleName: string;
  customerName: string;
  customerPhone: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  deliveryType: 'HUB_PICKUP' | 'DOORSTEP_DELIVERY';
  doorstepAddress?: string;
  totalFare: number;
  securityDeposit: number;
  handoverOtp: string;
  status: 'UPCOMING' | 'ACTIVE_TRIP' | 'COMPLETED';
}

interface FleetRadarMapProps {
  vehicles: RentalPartnerVehicle[];
  onSelectVehicle: (vehicle: RentalPartnerVehicle) => void;
  heightClass?: string;
}

const FleetRadarMap: React.FC<FleetRadarMapProps> = ({ vehicles, onSelectVehicle, heightClass = 'h-96' }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  const getVehicleCoordinates = (v: RentalPartnerVehicle, idx: number) => {
    const loc = (v.hubAddress || v.city || '').toLowerCase();
    if (loc.includes('indiranagar')) return { lat: 12.9716 + (idx * 0.003), lng: 77.6412 + (idx * 0.002), area: 'Indiranagar Hub' };
    if (loc.includes('koramangala')) return { lat: 12.9345 + (idx * 0.003), lng: 77.6101 + (idx * 0.002), area: 'Koramangala Hub' };
    if (loc.includes('hsr')) return { lat: 12.9116 + (idx * 0.003), lng: 77.6389 + (idx * 0.002), area: 'HSR Layout Hub' };
    if (loc.includes('whitefield')) return { lat: 12.9863 + (idx * 0.003), lng: 77.7378 + (idx * 0.002), area: 'Whitefield Hub' };
    if (loc.includes('bellandur')) return { lat: 12.9279 + (idx * 0.003), lng: 77.6835 + (idx * 0.002), area: 'Bellandur EcoSpace Hub' };
    if (loc.includes('hebbal')) return { lat: 13.0358 + (idx * 0.003), lng: 77.5970 + (idx * 0.002), area: 'Hebbal Hub' };
    
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const angle = (angles[idx % angles.length] * Math.PI) / 180;
    const distance = 0.02 + ((idx % 3) * 0.012);
    return {
      lat: 12.9716 + Math.sin(angle) * distance,
      lng: 77.5946 + Math.cos(angle) * distance,
      area: v.hubAddress || `${v.city} Central Hub`
    };
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const defaultCenter = [12.9716, 77.5946] as [number, number];
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(defaultCenter, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    markersRef.current = {};

    const bounds = L.latLngBounds([]);

    vehicles.forEach((vehicle, idx) => {
      const pos = getVehicleCoordinates(vehicle, idx);
      bounds.extend([pos.lat, pos.lng]);

      const isCar = vehicle.vehicleType === 'CAR';
      const isAvailable = vehicle.status === 'ACTIVE' && vehicle.isAvailable;
      const markerHtml = `
        <div style="
          background: ${isAvailable ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #d97706, #b45309)'};
          color: white;
          padding: 6px 12px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.35);
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          border: 2px solid white;
          cursor: pointer;
          transition: transform 0.2s;
        ">
          <span style="font-size: 13px;">${isCar ? '🚗' : '🛵'}</span>
          <span>${vehicle.name}</span>
          <span style="background: rgba(255,255,255,0.25); padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: 800;">₹${vehicle.dailyRate}/d</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-fleet-pin',
        html: markerHtml,
        iconSize: [145, 34],
        iconAnchor: [72, 17],
      });

      const marker = L.marker([pos.lat, pos.lng], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        onSelectVehicle(vehicle);
      });

      markersRef.current[vehicle.id] = marker;
    });

    if (vehicles.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [vehicles]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-850">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              Rental Vehicles Map
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </h3>
            <p className="text-[11px] text-slate-500">Vehicle availability and hub locations across Bengaluru</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-600" />
            All Telematics Normal
          </span>
        </div>
      </div>
      <div className="relative">
        <div ref={mapContainerRef} className={`${heightClass} w-full z-0`} />
        {vehicles.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-slate-900/10 dark:bg-black/30 backdrop-blur-[1px]">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl text-center">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">No Fleet on Radar</span>
              <span className="text-[11px] text-slate-500">Upload a vehicle to enable live Bengaluru telematics</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Clean initial state: no mock vehicles or bookings - host will upload manually
const SHOWCASE_VEHICLES: RentalPartnerVehicle[] = [];

const INITIAL_BOOKINGS: MockRentalBooking[] = [];

export const RentalDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navState = location.state as {
    justRegistered?: boolean;
    newVehicle?: RentalPartnerVehicle;
    registeredVehicle?: RentalPartnerVehicle;
    successMessage?: string;
  } | null;

  const [vehicles, setVehicles] = useState<RentalPartnerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['home', 'vehicles', 'bookings', 'earnings', 'profile', 'map'] as const;
  type TabType = typeof validTabs[number];
  const tabParam = searchParams.get('tab') as TabType | null;
  const activeTab: TabType = (tabParam && validTabs.includes(tabParam)) ? tabParam : 'home';

  const setActiveTab = (tab: TabType) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'home') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    });
  };
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'ALL' | 'CAR' | 'BIKE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleForTracking, setSelectedVehicleForTracking] = useState<RentalPartnerVehicle | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const [successBanner, setSuccessBanner] = useState<string | null>(
    navState?.successMessage ||
    (navState?.newVehicle || navState?.registeredVehicle
      ? `🎉 Successfully added ${(navState.newVehicle || navState.registeredVehicle)?.name} to your rental vehicles!`
      : null)
  );

  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Handover OTP Modal State
  const [selectedBookingForHandover, setSelectedBookingForHandover] = useState<MockRentalBooking | null>(null);
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [handoverSuccess, setHandoverSuccess] = useState(false);

  // Active & Upcoming Bookings
  const [bookings, setBookings] = useState<MockRentalBooking[]>(INITIAL_BOOKINGS);

  const fetchFleet = async () => {
    try {
      const data = await api.getRentalVehicles();
      const freshVehicle = navState?.newVehicle || navState?.registeredVehicle;
      let combined = [...data];
      if (freshVehicle && !combined.some(v => v.id === freshVehicle.id)) {
        combined.unshift(freshVehicle);
      }
      setVehicles(combined);
    } catch (err) {
      console.error('Failed to load rental vehicles:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const handleToggleStatus = async (vehicle: RentalPartnerVehicle) => {
    const nextStatus = vehicle.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setActionBusyId(vehicle.id);
    try {
      await api.updateRentalVehicleStatus(
        vehicle.id,
        nextStatus,
        nextStatus === 'SUSPENDED' ? 'Paused for maintenance' : 'Resumed availability'
      );
      setVehicles(prev =>
        prev.map(v => (v.id === vehicle.id ? { ...v, status: nextStatus as any } : v))
      );
    } catch (err: any) {
      // If mock vehicle not in backend, toggle locally
      setVehicles(prev =>
        prev.map(v => (v.id === vehicle.id ? { ...v, status: nextStatus as any } : v))
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleVerifyHandoverOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForHandover) return;

    if (inputOtp.trim() === selectedBookingForHandover.handoverOtp) {
      setHandoverSuccess(true);
      setOtpError('');
      setBookings(prev =>
        prev.map(b =>
          b.id === selectedBookingForHandover.id
            ? { ...b, status: 'ACTIVE_TRIP' }
            : b
        )
      );
      setTimeout(() => {
        setHandoverSuccess(false);
        setSelectedBookingForHandover(null);
        setInputOtp('');
      }, 1600);
    } else {
      setOtpError('Invalid OTP. Please ask renter to show the 4-digit code in their ParkCo app.');
    }
  };

  // Combine user vehicles with initial showcase vehicles and deduplicate
  const displayVehicles: RentalPartnerVehicle[] = useMemo(() => {
    const rawList = vehicles.length > 0
      ? [...vehicles, ...SHOWCASE_VEHICLES.filter(sv => !vehicles.some(v => v.id === sv.id || (v.name && sv.name && v.name.toLowerCase() === sv.name.toLowerCase())))]
      : SHOWCASE_VEHICLES;

    const seen = new Set<string>();
    return rawList.filter(v => {
      const key = (v.id || v.name || '').toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [vehicles]);

  const filteredVehicles = displayVehicles.filter(v => {
    if (vehicleTypeFilter !== 'ALL' && v.vehicleType !== vehicleTypeFilter) return false;
    if (searchQuery.trim() && !v.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
    return true;
  });

  // Calculate dynamic stats without duplicate or contradictory counts
  const carCount = displayVehicles.filter(v => v.vehicleType === 'CAR').length;
  const bikeCount = displayVehicles.filter(v => v.vehicleType === 'BIKE').length;
  const uniqueHubs = Array.from(new Set(displayVehicles.map(v => v.hubAddress || v.city).filter(Boolean)));

  const fleetSubtitleParts: string[] = [];
  if (carCount > 0) fleetSubtitleParts.push(`${carCount} ${carCount === 1 ? 'Car' : 'Cars'}`);
  if (bikeCount > 0) fleetSubtitleParts.push(`${bikeCount} ${bikeCount === 1 ? 'Scooter' : 'Scooters'}`);
  const fleetSubtitle = fleetSubtitleParts.length > 0
    ? `${fleetSubtitleParts.join(' • ')} in Hubs`
    : '0 vehicles listed • Ready to upload';

  const listedVehiclesCount = displayVehicles.length;
  const upcomingBookings = bookings.filter(b => b.status === 'UPCOMING');
  const upcomingBookingsCount = upcomingBookings.length;
  const nextBooking = upcomingBookings[0];
  const nextBookingPickup = nextBooking ? `Next: ${nextBooking.pickupDate}` : 'No upcoming bookings';

  const activeVehicles = displayVehicles.filter(v => v.status === 'ACTIVE');
  const estimatedMonthlyGross = activeVehicles.reduce((sum, v) => sum + (v.dailyRate * 22), 0);

  const totalTrips = displayVehicles.reduce((sum, v) => sum + (v.trips || 0), 0);
  const averageRating = displayVehicles.length > 0
    ? (displayVehicles.reduce((sum, v) => sum + (v.rating || 5.0), 0) / displayVehicles.length).toFixed(2)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8faf9] via-emerald-50/20 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 text-slate-900 dark:text-slate-100 pb-24 sm:pb-16 select-none relative overflow-x-hidden">
      
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute -top-40 right-0 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-96 -left-40 w-[450px] h-[450px] bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl" />

      {/* ================= 1. PREMIUM TOP NAVIGATION BAR ================= */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Left: Swiggy/Zomato Style Location Header */}
          <div className="flex items-center flex-shrink-0">
            <PartnerLocationHeader />
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'vehicles'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Vehicles ({displayVehicles.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Bookings</span>
              {upcomingBookingsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('earnings')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'earnings'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Earnings</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
          </nav>

          {/* Right: Actions & User */}
          <div className="flex items-center space-x-2">
            <Link
              to="/services"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200/80 dark:border-slate-700 transition active:scale-95 shadow-2xs"
              title="Manage Partner Services"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.4]" />
              <span className="whitespace-nowrap">Manage Services</span>
            </Link>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(prev => !prev)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative cursor-pointer border border-slate-200/60 dark:border-slate-800"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[1.8]" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      Host Notifications
                    </span>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2.5 mt-2.5 text-xs">
                    {displayVehicles.length > 0 ? (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800">
                        <span className="font-bold text-emerald-900 dark:text-emerald-300 block">Fleet Ready for Bookings</span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400">All registered vehicles are active and available in Bangalore hubs.</span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-center py-4">
                        <span className="text-slate-500 text-xs">No notifications yet. Upload your vehicle to start hosting.</span>
                      </div>
                    )}
                    {bookings.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                        <span className="font-bold text-slate-900 dark:text-white block">Upcoming Handover</span>
                        <span className="text-[11px] text-slate-500">{bookings[0].customerName} booked {bookings[0].vehicleName}.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 sm:pb-12">

        {/* Success Banner */}
        {successBanner && (
          <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================= TAB 1: OVERVIEW / HOME ================= */}
        {activeTab === 'home' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            {/* Minimal Welcome Header */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  ParkCo Fleet Partner Overview
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/20 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Hubs
              </span>
            </div>

            {/* THE ONLY 3 CARDS ON HOME PAGE */}
            <div className="space-y-3.5 sm:space-y-4">
              
              {/* Card 1: Listed Vehicles */}
              <div
                onClick={() => setActiveTab('vehicles')}
                className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <Car className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Listed Vehicles
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {listedVehiclesCount}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Active Fleet
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition shrink-0" />
                  </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                    {fleetSubtitle}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                    Manage Vehicles →
                  </span>
                </div>
              </div>

              {/* Card 2: Revenue */}
              <div
                onClick={() => setActiveTab('earnings')}
                className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <IndianRupee className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Revenue
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        ₹{estimatedMonthlyGross.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Gross
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition shrink-0" />
                  </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                    Projected monthly (Auto-settled UPI)
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">
                    View Earnings →
                  </span>
                </div>
              </div>

              {/* Card 3: Upcoming Trip */}
              <div
                onClick={() => setActiveTab('bookings')}
                className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <Calendar className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Upcoming Trip
                      </span>
                      <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                        {upcomingBookingsCount > 0 && nextBooking
                          ? `${nextBooking.vehicleName}`
                          : 'No Upcoming Trips'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {upcomingBookingsCount > 0 ? (
                      <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {upcomingBookingsCount} Scheduled
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        0 Scheduled
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition shrink-0" />
                  </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                    {upcomingBookingsCount > 0 && nextBooking
                      ? `${nextBooking.pickupDate} • ${nextBooking.customerName}`
                      : 'All vehicles currently available for booking'}
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                    View Trips →
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 2: RENTAL VEHICLES ================= */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Rental Vehicles Management
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Control daily tariffs, vehicle availability & bookings
                </p>
              </div>
              <Link
                to="/register/rental"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#0F5132] hover:bg-[#0b3e27] text-white font-bold text-xs shadow-md transition self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Register Vehicle</span>
              </Link>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search vehicle by make, model or hub..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
                />
              </div>

              <div className="flex items-center space-x-1.5 text-xs bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-start sm:self-auto">
                <button
                  onClick={() => setVehicleTypeFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    vehicleTypeFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({displayVehicles.length})
                </button>
                <button
                  onClick={() => setVehicleTypeFilter('CAR')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    vehicleTypeFilter === 'CAR'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Cars
                </button>
                <button
                  onClick={() => setVehicleTypeFilter('BIKE')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    vehicleTypeFilter === 'BIKE'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Bikes
                </button>
              </div>
            </div>

            {/* Vehicles Cards Grid */}
            {filteredVehicles.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-4 max-w-md mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Car className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">No Vehicles Listed</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Upload your cars or bikes manually to start hosting.</p>
                </div>
                <Link
                  to="/register/rental"
                  className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-[#0F5132] hover:bg-[#0b3e27] text-white font-bold text-xs shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register & Upload Vehicle</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredVehicles.map((vehicle) => {
                  const isActive = vehicle.status === 'ACTIVE';
                  const isBusy = actionBusyId === vehicle.id;

                  return (
                    <div
                      key={vehicle.id}
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        {/* Image header */}
                        <div className="h-44 w-full relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <img
                            src={vehicle.photo}
                            alt={vehicle.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 flex gap-1.5">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-md ${
                              isActive
                                ? 'bg-emerald-600/90 text-white'
                                : 'bg-slate-800/90 text-slate-200'
                            }`}>
                              {isActive ? '● Available' : 'Paused'}
                            </span>
                          </div>
                          <div className="absolute top-3 right-3">
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white shadow-md">
                              ★ {vehicle.rating} ({vehicle.trips} trips)
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                                {vehicle.name}
                              </h3>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{vehicle.hubAddress || vehicle.city}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-base text-emerald-700 dark:text-emerald-400 block">
                                ₹{vehicle.dailyRate.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">per day</span>
                            </div>
                          </div>

                          {/* Specs Pills */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {vehicle.transmission}
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {vehicle.fuelType}
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {vehicle.seats} Seats
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {vehicle.mileageOrRange}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                        <button
                          onClick={() => setSelectedVehicleForTracking(vehicle)}
                          className="flex-1 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Live GPS</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(vehicle)}
                          disabled={isBusy}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isActive
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-[#0F5132] hover:bg-[#0b3e27] text-white'
                          }`}
                        >
                          {isBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isActive ? 'Pause' : 'Activate'}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: BOOKINGS & HANDOVERS ================= */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Rental Bookings & Trips
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Customer reservations, key handover OTP verifications, and completed rental trips
              </p>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">No Bookings Yet</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">When customers book your rental vehicles, reservation and trip schedules will show up here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {booking.id}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Verified Renter</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        booking.status === 'UPCOMING'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {booking.status === 'UPCOMING' ? 'Pending Key Handover' : 'Active In-Trip'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                          {booking.vehicleName}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Renter: <strong className="text-slate-800 dark:text-slate-200">{booking.customerName}</strong>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{booking.doorstepAddress}</span>
                        </p>
                      </div>

                      <div className="space-y-1 sm:text-right">
                        <div className="text-xs text-slate-500">
                          Duration: <strong>{booking.pickupDate}</strong> → <strong>{booking.returnDate}</strong>
                        </div>
                        <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                          Total Fare: ₹{booking.totalFare.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Security Deposit: ₹0 (ParkCo Guaranteed)
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      {booking.status === 'UPCOMING' ? (
                        <button
                          onClick={() => {
                            setSelectedBookingForHandover(booking);
                            setInputOtp('');
                            setOtpError('');
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0b3e27] text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-2"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span>Verify Handover Key OTP</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Keys Verified & Handed Over</span>
                        </span>
                      )}

                      <a
                        href={`tel:${booking.customerPhone}`}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Renter</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: LIVE FLEET RADAR MAP ================= */}
        {activeTab === 'map' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Bengaluru Rental Locations & Hubs
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Vehicle availability, geofence bounds, and hub diagnostics
              </p>
            </div>

            <FleetRadarMap
              vehicles={displayVehicles}
              onSelectVehicle={(v) => setSelectedVehicleForTracking(v)}
              heightClass="h-[550px]"
            />
          </div>
        )}

        {/* ================= TAB 5: EARNINGS & TARIFFS ================= */}
        {activeTab === 'earnings' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Tariffs & Payout Settlements
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Track gross rental revenues, auto-disbursed UPI settlements, and damage protection
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Projected Monthly Rental Revenue
                </span>
                <div className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1">
                  ₹{estimatedMonthlyGross.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Calculated based on 22 days/month average booking utilization across active rental vehicles.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Payout UPI VPA</span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">
                    {user?.phone_number ? `${user.phone_number.replace(/\D/g, '')}@upi` : 'partner@okaxis'}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
                    ● Auto-settled daily after trip completion
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Damage Protection Policy</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                    ₹50,000 Zero-Liability Cover
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 inline-block">
                    Pre-authorized for every verified trip booking
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 6: HOST PROFILE & SERVICES ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Host Account & Portals
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Verified rental partner credentials and portal mode switcher
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0F5132] to-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {user?.full_name?.charAt(0) || 'H'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    {user?.full_name || 'Vehicle Rental Host'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {user?.email || 'partner@parkshare.in'}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verified Vehicle Rental Host</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Switch to Parking Spot Host Dashboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => logout()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out from Host Session</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ================= MOBILE FLOATING GLASS DOCK (ELEVATED) ================= */}
      <div className="md:hidden fixed bottom-3 inset-x-3 z-40 max-w-md mx-auto bg-slate-950/90 text-white backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl p-1.5">
        <div className="grid grid-cols-5 gap-1 text-center">
          
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'home'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4.5 h-4.5 mb-0.5 stroke-[2.2]" />
            <span className="text-[10px] font-bold leading-none">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex flex-col items-center justify-center py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'vehicles'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-4.5 h-4.5 mb-0.5 stroke-[2.2]" />
            <span className="text-[10px] font-bold leading-none">Vehicles</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex flex-col items-center justify-center py-2 rounded-xl transition cursor-pointer relative ${
              activeTab === 'bookings'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4.5 h-4.5 mb-0.5 stroke-[2.2]" />
            <span className="text-[10px] font-bold leading-none">Bookings</span>
            {upcomingBookingsCount > 0 && (
              <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('earnings')}
            className={`flex flex-col items-center justify-center py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'earnings'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4.5 h-4.5 mb-0.5 stroke-[2.2]" />
            <span className="text-[10px] font-bold leading-none">Earnings</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4.5 h-4.5 mb-0.5 stroke-[2.2]" />
            <span className="text-[10px] font-bold leading-none">Profile</span>
          </button>

        </div>
      </div>

      {/* Live Vehicle GPS Tracker & Cockpit Modal */}
      {selectedVehicleForTracking && (
        <LiveVehicleTrackerModal
          vehicle={selectedVehicleForTracking}
          onClose={() => setSelectedVehicleForTracking(null)}
        />
      )}

      {/* Handover OTP Verification Modal */}
      {selectedBookingForHandover && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <KeyRound className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Handover Key Verification
                </h3>
              </div>
              <button
                onClick={() => setSelectedBookingForHandover(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="font-extrabold text-slate-900 dark:text-white">
                {selectedBookingForHandover.vehicleName}
              </div>
              <div className="text-slate-500 text-[11px]">
                Renter: <strong>{selectedBookingForHandover.customerName}</strong>
              </div>
              <div className="text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-bold pt-1">
                (Demo Test OTP: {selectedBookingForHandover.handoverOtp})
              </div>
            </div>

            <form onSubmit={handleVerifyHandoverOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Enter 4-Digit Customer OTP:
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value)}
                  placeholder="e.g. 4821"
                  className="w-full text-center tracking-widest text-2xl font-extrabold font-mono px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F5132] outline-none"
                  autoFocus
                />
              </div>

              {otpError && (
                <div className="text-xs text-rose-600 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{otpError}</span>
                </div>
              )}

              {handoverSuccess && (
                <div className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Handover Verified! Car keys released to customer.</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForHandover(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inputOtp.length < 4 || handoverSuccess}
                  className="flex-1 py-3 rounded-2xl bg-[#0F5132] hover:bg-[#0b3e27] disabled:opacity-50 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Confirm Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default RentalDashboardPage;
