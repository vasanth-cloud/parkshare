import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import L from 'leaflet';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RentalPartnerVehicle } from '../types';
import { LiveVehicleTrackerModal } from '../components/LiveVehicleTrackerModal';
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
  Search
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
}

const FleetRadarMap: React.FC<FleetRadarMapProps> = ({ vehicles, onSelectVehicle }) => {
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
      const markerHtml = `
        <div style="
          background-color: ${vehicle.status === 'ACTIVE' ? '#0F5132' : '#d97706'};
          color: white;
          padding: 6px 10px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          border: 2px solid white;
          cursor: pointer;
        ">
          <span>${isCar ? '🚗' : '🛵'}</span>
          <span>${vehicle.name}</span>
          <span style="background: rgba(255,255,255,0.25); padding: 1px 5px; border-radius: 9999px; font-size: 9px;">₹${vehicle.dailyRate}/d</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-fleet-pin',
        html: markerHtml,
        iconSize: [140, 32],
        iconAnchor: [70, 16],
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
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Live Fleet Geo-Radar
            </h3>
            <p className="text-[11px] text-slate-500">Live GPS tracking and hub pins across Bengaluru</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
          ● All Systems Normal
        </span>
      </div>
      <div ref={mapContainerRef} className="h-96 w-full z-0" />
    </div>
  );
};

// Initial showcase items matching user's exact mockup
const SHOWCASE_VEHICLES: RentalPartnerVehicle[] = [
  {
    id: 'veh-demo-i20',
    name: 'Hyundai i20',
    vehicleType: 'CAR',
    category: 'HATCHBACK',
    photo: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=500&q=80',
    rating: 4.88,
    trips: 42,
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    seats: 5,
    mileageOrRange: '20 kmpl',
    hourlyRate: 120,
    dailyRate: 1500,
    securityDeposit: 0,
    isAvailable: true,
    badge: 'Available',
    features: ['Automatic', 'Touchscreen', 'Reverse Camera'],
    city: 'Bengaluru',
    hubAddress: 'Indiranagar Hub, Bengaluru',
    status: 'ACTIVE',
    partnerName: 'ParkCo Partner'
  },
  {
    id: 'veh-demo-scooter',
    name: 'Scooter',
    vehicleType: 'BIKE',
    category: 'SCOOTER',
    photo: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=500&q=80',
    rating: 4.82,
    trips: 68,
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    seats: 2,
    mileageOrRange: '45 kmpl',
    hourlyRate: 50,
    dailyRate: 500,
    securityDeposit: 0,
    isAvailable: false,
    badge: 'Booked',
    features: ['Combi-Brake', 'Storage Box', 'Free Helmet'],
    city: 'Bengaluru',
    hubAddress: 'Koramangala Hub, Bengaluru',
    status: 'SUSPENDED',
    partnerName: 'ParkCo Partner'
  }
];

const INITIAL_BOOKINGS: MockRentalBooking[] = [
  {
    id: 'RB-9842',
    vehicleId: 'veh-demo-i20',
    vehicleName: 'Hyundai i20',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98450 12345',
    pickupDate: 'Tomorrow, 09:00 AM',
    returnDate: 'Oct 24, 08:00 PM',
    pickupTime: '09:00 AM',
    deliveryType: 'HUB_PICKUP',
    doorstepAddress: 'Indiranagar Hub, Bengaluru',
    totalFare: 3000,
    securityDeposit: 0,
    handoverOtp: '4821',
    status: 'UPCOMING'
  },
  {
    id: 'RB-9843',
    vehicleId: 'veh-demo-scooter',
    vehicleName: 'Scooter',
    customerName: 'Priya Sharma',
    customerPhone: '+91 98765 43210',
    pickupDate: 'Today, 02:00 PM',
    returnDate: 'Oct 23, 10:00 AM',
    pickupTime: '02:00 PM',
    deliveryType: 'HUB_PICKUP',
    doorstepAddress: 'Koramangala Hub, Bengaluru',
    totalFare: 1000,
    securityDeposit: 0,
    handoverOtp: '7193',
    status: 'UPCOMING'
  }
];

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
  const [activeTab, setActiveTab] = useState<'home' | 'vehicles' | 'bookings' | 'earnings' | 'profile' | 'map'>('home');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'ALL' | 'CAR' | 'BIKE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleForTracking, setSelectedVehicleForTracking] = useState<RentalPartnerVehicle | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const [successBanner, setSuccessBanner] = useState<string | null>(
    navState?.successMessage ||
    (navState?.newVehicle || navState?.registeredVehicle
      ? `🎉 Successfully added ${(navState.newVehicle || navState.registeredVehicle)?.name} to your fleet!`
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
      console.error('Failed to load rental fleet:', err);
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

  // Combine user vehicles with initial showcase vehicles
  const displayVehicles: RentalPartnerVehicle[] = vehicles.length > 0
    ? [...vehicles, ...SHOWCASE_VEHICLES.filter(sv => !vehicles.some(v => v.name.toLowerCase() === sv.name.toLowerCase()))]
    : SHOWCASE_VEHICLES;

  const filteredVehicles = displayVehicles.filter(v => {
    if (vehicleTypeFilter !== 'ALL' && v.vehicleType !== vehicleTypeFilter) return false;
    if (searchQuery.trim() && !v.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
    return true;
  });

  const listedVehiclesCount = vehicles.length > 0 ? Math.max(vehicles.length, 3) : 3;
  const upcomingBookingsCount = bookings.filter(b => b.status === 'UPCOMING').length || 2;
  const activeVehicles = displayVehicles.filter(v => v.status === 'ACTIVE');
  const estimatedMonthlyGross = activeVehicles.reduce((sum, v) => sum + (v.dailyRate * 22), 0);

  return (
    <div className="min-h-screen bg-[#f8faf9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28 select-none">
      
      {/* Top Container */}
      <div className="max-w-xl mx-auto px-4 pt-5 pb-2">
        
        {/* ================= 1. TOP HEADER (EXACT MOCKUP) ================= */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center space-x-3">
            {/* Green rounded-square car badge */}
            <div className="w-12 h-12 rounded-2xl bg-[#0F5132] text-white flex items-center justify-center shadow-xs">
              <Car className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                ParkCo Host
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vehicle rental dashboard
              </p>
            </div>
          </div>

          {/* Right Action: Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(prev => !prev)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5 stroke-[1.8]" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white dark:ring-slate-950" />
            </button>

            {/* Notification Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">Host Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2.5 mt-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800">
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 block">RC Number Verified</span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">MoRTH Vahan validation successful for active fleet.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white block">Upcoming Handover Tomorrow</span>
                    <span className="text-[11px] text-slate-500">Rahul Verma booked Hyundai i20 at Indiranagar Hub.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Success Banner if redirected from Registration */}
        {successBanner && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="p-1 text-emerald-700 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ================= TAB CONTENT SWITCHER ================= */}

        {/* ================= TAB: HOME (EXACT MATCH TO SCREENSHOT) ================= */}
        {activeTab === 'home' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Greeting */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Welcome back!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage your vehicles and rental business.
              </p>
            </div>

            {/* 2 Stats Cards */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Card 1: Listed vehicles */}
              <div 
                onClick={() => setActiveTab('vehicles')}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 transition hover:shadow-xs cursor-pointer"
              >
                <div className="text-[#0F5132] dark:text-emerald-400 mb-2">
                  <Car className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {listedVehiclesCount}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Listed vehicles
                </div>
              </div>

              {/* Card 2: Upcoming bookings */}
              <div 
                onClick={() => setActiveTab('bookings')}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 transition hover:shadow-xs cursor-pointer"
              >
                <div className="text-[#0F5132] dark:text-emerald-400 mb-2">
                  <Calendar className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {upcomingBookingsCount}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Upcoming bookings
                </div>
              </div>
            </div>

            {/* "Your vehicles" Container */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Your vehicles
                </h3>
                <button
                  onClick={() => setActiveTab('vehicles')}
                  className="text-xs font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {displayVehicles.slice(0, 3).map((vehicle, idx) => (
                  <div key={vehicle.id || idx} className="py-3 first:pt-2 last:pb-1 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-700/60">
                        <img
                          src={vehicle.photo}
                          alt={vehicle.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {vehicle.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          ₹{vehicle.dailyRate.toLocaleString('en-IN')}/day
                        </p>
                        <div className="mt-1">
                          {vehicle.status === 'ACTIVE' && vehicle.isAvailable ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#d1e7dd] text-[#0f5132] dark:bg-emerald-950/80 dark:text-emerald-300">
                              Available
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e9ecef] text-[#495057] dark:bg-slate-800 dark:text-slate-300">
                              Booked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedVehicleForTracking(vehicle)}
                        className="p-2 rounded-xl text-slate-400 hover:text-emerald-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Live GPS Location"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Vehicle Quick CTA */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <Link
                  to="/register/rental"
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-emerald-600/40 hover:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register & Add New Vehicle</span>
                </Link>
              </div>
            </div>

            {/* Mockup Section Label */}
            <div className="pt-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Host bottom navigation bar
              </h4>
            </div>
          </div>
        )}

        {/* ================= TAB: VEHICLES (FULL FLEET INVENTORY) ================= */}
        {activeTab === 'vehicles' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Fleet Inventory
                </h2>
                <p className="text-xs text-slate-500">Manage rates, availability & live tracking</p>
              </div>
              <Link
                to="/register/rental"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0b3e27] text-white font-bold text-xs shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vehicle</span>
              </Link>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search vehicle name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center space-x-1 text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setVehicleTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    vehicleTypeFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setVehicleTypeFilter('CAR')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    vehicleTypeFilter === 'CAR'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Cars
                </button>
                <button
                  onClick={() => setVehicleTypeFilter('BIKE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    vehicleTypeFilter === 'BIKE'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Bikes
                </button>
              </div>
            </div>

            {/* Vehicles List */}
            <div className="space-y-3">
              {filteredVehicles.map((vehicle) => {
                const isActive = vehicle.status === 'ACTIVE';
                const isBusy = actionBusyId === vehicle.id;

                return (
                  <div
                    key={vehicle.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-700">
                          <img
                            src={vehicle.photo}
                            alt={vehicle.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {vehicle.name}
                          </h4>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                            ₹{vehicle.dailyRate.toLocaleString('en-IN')}/day • {vehicle.transmission}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-[#d1e7dd] text-[#0f5132] dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-[#e9ecef] text-[#495057] dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {isActive ? 'Available' : 'Paused'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {vehicle.hubAddress || vehicle.city}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setSelectedVehicleForTracking(vehicle)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <Radio className="w-3 h-3" />
                          <span>Live GPS</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(vehicle)}
                          disabled={isBusy}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            isActive
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-[#0F5132] hover:bg-[#0b3e27] text-white'
                          }`}
                        >
                          {isBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : isActive ? 'Pause' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB: BOOKINGS (HANDOVERS & TRIPS) ================= */}
        {activeTab === 'bookings' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Upcoming & Active Bookings
              </h2>
              <p className="text-xs text-slate-500">Verify customer OTP and manage handovers</p>
            </div>

            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="font-mono text-xs font-bold text-slate-400">{booking.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      booking.status === 'UPCOMING'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {booking.status === 'UPCOMING' ? 'Pending Handover' : 'Active In-Trip'}
                    </span>
                  </div>

                  <div className="py-2.5 space-y-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {booking.vehicleName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Renter: <strong className="text-slate-800 dark:text-slate-200">{booking.customerName}</strong> ({booking.customerPhone})
                    </p>
                    <p className="text-xs text-slate-500">
                      Duration: {booking.pickupDate} → {booking.returnDate}
                    </p>
                    <p className="text-xs font-semibold text-[#0F5132] dark:text-emerald-400">
                      Total Fare: ₹{booking.totalFare.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                    {booking.status === 'UPCOMING' ? (
                      <button
                        onClick={() => {
                          setSelectedBookingForHandover(booking);
                          setInputOtp('');
                          setOtpError('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#0F5132] hover:bg-[#0b3e27] text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Verify Handover OTP</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Keys Verified & Released</span>
                      </span>
                    )}

                    <a
                      href={`tel:${booking.customerPhone}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call Renter</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB: EARNINGS ================= */}
        {activeTab === 'earnings' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Tariffs & Earnings
              </h2>
              <p className="text-xs text-slate-500">Payout settlements and fleet performance</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Estimated Monthly Gross</span>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  ₹{estimatedMonthlyGross.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-slate-500">Projected on 22 days/month average utilization</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Payout UPI</span>
                  <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {user?.phone_number ? `${user.phone_number.replace(/\D/g, '')}@upi` : 'partner@okaxis'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">● Auto-disbursed</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Damage Protection</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    ₹50,000 Cover
                  </span>
                  <span className="text-[10px] text-slate-400">Included on all trips</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: PROFILE ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Host Account & Services
              </h2>
              <p className="text-xs text-slate-500">Business details and mode switching</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#0F5132] text-white flex items-center justify-center font-bold text-lg">
                  {user?.full_name?.charAt(0) || 'H'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {user?.full_name || 'Fleet Partner Host'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {user?.email || 'partner@parkshare.in'}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Attestr MoRTH RC Verified Host</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => navigate('/services')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                >
                  <span>Switch to Partner Services Hub</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                >
                  <span>Switch to Parking Spot Host</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => logout()}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                >
                  <span>Sign Out</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ================= 5. HOST BOTTOM NAVIGATION BAR (FIXED) ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-2 px-3 shadow-lg">
        <div className="max-w-xl mx-auto">
          <div className="grid grid-cols-5 gap-1 text-center">
            
            {/* 1. Home */}
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === 'home'
                  ? 'text-[#0F5132] dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-5 h-5 mb-1 stroke-[1.8]" />
              <span className="text-[11px] leading-none">Home</span>
            </button>

            {/* 2. Vehicles */}
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === 'vehicles'
                  ? 'text-[#0F5132] dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Car className="w-5 h-5 mb-1 stroke-[1.8]" />
              <span className="text-[11px] leading-none">Vehicles</span>
            </button>

            {/* 3. Bookings */}
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === 'bookings'
                  ? 'text-[#0F5132] dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-5 h-5 mb-1 stroke-[1.8]" />
              <span className="text-[11px] leading-none">Bookings</span>
            </button>

            {/* 4. Earnings */}
            <button
              onClick={() => setActiveTab('earnings')}
              className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === 'earnings'
                  ? 'text-[#0F5132] dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Wallet className="w-5 h-5 mb-1 stroke-[1.8]" />
              <span className="text-[11px] leading-none">Earnings</span>
            </button>

            {/* 5. Profile */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'text-[#0F5132] dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-5 h-5 mb-1 stroke-[1.8]" />
              <span className="text-[11px] leading-none">Profile</span>
            </button>

          </div>
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
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Handover Key Verification
                </h3>
              </div>
              <button
                onClick={() => setSelectedBookingForHandover(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {selectedBookingForHandover.vehicleName}
              </div>
              <div className="text-slate-500 text-[11px]">
                Renter: {selectedBookingForHandover.customerName}
              </div>
              <div className="text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold">
                (Demo Test OTP: {selectedBookingForHandover.handoverOtp})
              </div>
            </div>

            <form onSubmit={handleVerifyHandoverOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Enter Customer Handover OTP:
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value)}
                  placeholder="e.g. 4821"
                  className="w-full text-center tracking-widest text-xl font-bold font-mono px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F5132] outline-none"
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

              <div className="flex gap-2">
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
                  className="flex-1 py-3 rounded-2xl bg-[#0F5132] hover:bg-[#0b3e27] disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer"
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
