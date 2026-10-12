import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {
  Search,
  MapPin,
  Star,
  Zap,
  Shield,
  Navigation,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  X,
  CheckCircle2,
  ChevronRight,
  Bot,
  Lock,
  Car,
  Bike,
  ShieldCheck,
  Compass,
  Layers,
  Crosshair,
  UserCheck,
  Droplets
} from 'lucide-react';
import { api } from '../services/api';
import { ParkingListing, Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ActiveParkingCard } from '../components/ActiveParkingCard';

interface CustomerLandingPageProps {
  onOpenChat?: () => void;
}

export const CustomerLandingPage: React.FC<CustomerLandingPageProps> = ({ onOpenChat }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Active parking state (unlocked with navigation after payment)
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  // Search & Filter state
  const [city, setCity] = useState('Bengaluru');
  const [area, setArea] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [vehicleType, setVehicleType] = useState<'CAR' | 'BIKE'>('CAR');
  const [filterTag, setFilterTag] = useState<'ALL' | 'EV' | 'COVERED' | 'TOP_RATED'>('ALL');

  // Listings state
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<ParkingListing | null>(null);

  // Live Location & GPS state
  const [liveLocationName, setLiveLocationName] = useState<string>('BTM Layout, Bengaluru');
  const [currentCoords, setCurrentCoords] = useState<[number, number]>([12.9166, 77.6101]); // BTM Layout default
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Quick parking hotspots in Bengaluru
  const quickHotspots = [
    { label: 'All City', area: '', coords: [12.9352, 77.6245] as [number, number] },
    { label: 'BTM Layout', area: 'BTM Layout', coords: [12.9166, 77.6101] as [number, number] },
    { label: 'Whitefield', area: 'Whitefield', coords: [12.9698, 77.7499] as [number, number] },
    { label: 'Koramangala', area: 'Koramangala', coords: [12.9352, 77.6245] as [number, number] },
    { label: 'Indiranagar', area: 'Indiranagar', coords: [12.9784, 77.6408] as [number, number] },
  ];

  // Fetch listings
  const fetchListings = async (searchCity = city, searchArea = area, vType = vehicleType) => {
    setLoading(true);
    try {
      const data = await api.searchListings({
        city: searchCity || undefined,
        area: searchArea || undefined,
        vehicle_type: vType || undefined,
      });
      setListings(data);
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveBooking = async () => {
    if (!user) {
      setActiveBooking(null);
      return;
    }
    try {
      const data = await api.getActiveBooking();
      setActiveBooking(data);
    } catch (err) {
      console.error('Error fetching active booking:', err);
    }
  };

  useEffect(() => {
    fetchListings();
    checkActiveBooking();
  }, [user]);

  // Distance calculations
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getSpotDistance = (spot: ParkingListing): number => {
    if (!spot.latitude || !spot.longitude) return 999;
    return calculateDistanceKm(currentCoords[0], currentCoords[1], spot.latitude, spot.longitude);
  };

  const formatApproxDistance = (distKm: number): string => {
    if (distKm <= 0.08) return '~100 m';
    if (distKm < 1) {
      const meters = Math.round((distKm * 1000) / 50) * 50;
      return `~${Math.max(100, meters)} m`;
    }
    return `~${distKm.toFixed(1)} km`;
  };

  // Nearby sorted listings
  const nearbyListings = [...listings].sort((a, b) => getSpotDistance(a) - getSpotDistance(b));

  const filteredListings = nearbyListings.filter((item) => {
    if (filterTag === 'EV') return item.has_ev_charging;
    if (filterTag === 'COVERED') return item.is_covered;
    if (filterTag === 'TOP_RATED') return (item.average_rating || 0) >= 4.5;
    return true;
  });

  // Geolocation trigger
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setCurrentCoords([latitude, longitude]);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1 });
        }

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          if (data && data.address) {
            const locName = [
              data.address.suburb || data.address.neighbourhood || data.address.residential,
              data.address.city || data.address.town,
            ]
              .filter(Boolean)
              .join(', ') || data.display_name.split(',').slice(0, 2).join(',');

            setLiveLocationName(locName);
            if (data.address.city) setCity(data.address.city);
          }
          setLocationSuccessMsg(`📍 Position locked • Showing nearby parking`);
          setTimeout(() => setLocationSuccessMsg(null), 3500);
          fetchListings(city, '');
        } catch {
          // Fallback
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up if instance exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: currentCoords,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // High-performance OpenStreetMap tiles (100% free, no API key required)
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(map);

    tileLayerRef.current = tiles;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    const userGroup = L.layerGroup().addTo(map);
    userMarkerLayerRef.current = userGroup;

    mapInstanceRef.current = map;

    // Invalidate size shortly after mount for perfect mobile dimensions
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isDark]);

  // Update User Marker
  useEffect(() => {
    if (!userMarkerLayerRef.current) return;
    userMarkerLayerRef.current.clearLayers();

    const userBeaconHtml = `
      <div class="relative flex items-center justify-center pointer-events-none">
        <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-emerald-400 opacity-60"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-600 border-2 border-white shadow-lg"></span>
      </div>
    `;

    const userBeacon = L.marker(currentCoords, {
      icon: L.divIcon({
        className: 'user-radar-pin',
        html: userBeaconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
      interactive: false,
    });

    userBeacon.addTo(userMarkerLayerRef.current);
  }, [currentCoords]);

  // Update Parking Spot Markers on Map
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    filteredListings.forEach((spot, idx) => {
      if (!spot.latitude || !spot.longitude) return;

      const letter = String.fromCharCode(65 + idx);
      const isSelected = selectedSpot?.id === spot.id;
      const price = spot.pricing_rule?.hourly_price || 40;
      const distStr = formatApproxDistance(getSpotDistance(spot));

      // Disperse close pins around the neighborhood so each is clearly visible and clickable
      const angle = (idx * 2 * Math.PI) / Math.max(1, filteredListings.length);
      const spreadDist = 0.0016; // ~150 meters dispersion
      const markerLat = spot.latitude + Math.sin(angle) * spreadDist;
      const markerLng = spot.longitude + Math.cos(angle) * spreadDist;

      // Modern Mobility Badge Marker with clean auto-width
      const badgeHtml = `
        <div class="flex flex-col items-center cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-110 z-50' : 'hover:scale-105'
        }">
          <div class="flex items-center space-x-1.5 px-3 py-1.5 rounded-full shadow-2xl border text-xs whitespace-nowrap transition-colors ${
            isSelected
              ? 'bg-emerald-600 text-white border-white ring-4 ring-emerald-400/50 font-black'
              : 'bg-slate-900 text-white border-slate-700/80 backdrop-blur-md font-bold'
          }">
            <span class="${isSelected ? 'text-white' : 'text-emerald-400'} font-black text-[11px]">🅿️ ${letter}</span>
            <span class="text-[11px] font-extrabold text-emerald-300">• ${distStr}</span>
            <span class="text-[11px] font-bold opacity-90">₹${price}</span>
          </div>
          <div class="w-2.5 h-2.5 rotate-45 -mt-1.5 shadow-md ${
            isSelected ? 'bg-emerald-600' : 'bg-slate-900'
          }"></div>
        </div>
      `;

      const marker = L.marker([markerLat, markerLng], {
        icon: L.divIcon({
          className: 'custom-map-pin',
          html: badgeHtml,
          iconSize: [140, 40],
          iconAnchor: [70, 40],
        }),
      });

      marker.on('click', () => {
        setSelectedSpot(spot);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([markerLat, markerLng], 15.5, { duration: 0.8 });
        }
      });

      marker.addTo(markersLayerRef.current!);

      // Privacy perimeter circle
      L.circle([markerLat, markerLng], {
        radius: 100, // 100m approximate area
        color: isSelected ? '#10b981' : '#64748b',
        fillColor: isSelected ? '#10b981' : '#94a3b8',
        fillOpacity: isSelected ? 0.2 : 0.08,
        weight: isSelected ? 2 : 1,
        dashArray: '4, 4',
      }).addTo(markersLayerRef.current!);
    });
  }, [filteredListings, selectedSpot, currentCoords]);

  // Handle Search Input submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedSpot(null);
    setArea(searchInput);
    fetchListings(city, searchInput, vehicleType);
  };

  const handleHotspotClick = (hArea: string, coords: [number, number]) => {
    setArea(hArea);
    setSearchInput(hArea);
    setSelectedSpot(null);
    fetchListings(city, hArea, vehicleType);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(coords, 14, { duration: 0.8 });
    }
  };

  const handleVehicleChange = (newType: 'CAR' | 'BIKE') => {
    setVehicleType(newType);
    fetchListings(city, area, newType);
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-100 dark:bg-slate-950 select-none">
      
      {/* Toast Notification */}
      {locationSuccessMsg && (
        <div className="absolute top-4 inset-x-4 max-w-sm mx-auto z-40 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
          <span className="truncate">{locationSuccessMsg}</span>
        </div>
      )}

      {/* FULL SCREEN INTERACTIVE LEAFLET MAP */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* ========================================================================= */}
      {/* FLOATING TOP OVERLAY (Search, Hotspots, Vehicle Filter)                    */}
      {/* ========================================================================= */}
      <div className="absolute top-3 inset-x-3 max-w-md mx-auto z-20 space-y-2 pointer-events-none">
        
        {/* Compact Floating Active Trip Banner */}
        {activeBooking && (
          <div 
            onClick={() => navigate('/bookings')}
            className="pointer-events-auto bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white rounded-2xl p-2.5 shadow-xl border border-blue-500/30 flex items-center justify-between gap-2.5 transition active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
                    Active Pass • {activeBooking.space_number?.toUpperCase().startsWith('SLOT') ? activeBooking.space_number : `Slot ${activeBooking.space_number || 'A01'}`}
                  </span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.2 rounded-full border border-blue-400/30">
                    {activeBooking.status === 'CONFIRMED' ? 'En Route' : activeBooking.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs font-black text-white truncate leading-tight mt-0.5">
                  {activeBooking.listing?.title || 'Your Reserved Space'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1 flex-shrink-0">
              {activeBooking.listing?.latitude && activeBooking.listing?.longitude && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${activeBooking.listing?.latitude},${activeBooking.listing?.longitude}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold transition flex items-center justify-center shadow-xs cursor-pointer"
                  title="Navigate via Maps"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/bookings');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center space-x-1 shadow-xs cursor-pointer"
              >
                <span>Pass</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Floating Glassmorphic Search Bar */}
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[24px] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/80 dark:border-slate-800 space-y-2">
          
          <div className="flex items-center space-x-2">
            {/* Back to Services Launcher */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center justify-center flex-shrink-0 cursor-pointer shadow-xs active:scale-95"
              title="Back to Services Selection"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-2xl px-3 py-2 space-x-2">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search area, metro, locality..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setArea('');
                    fetchListings(city, '', vehicleType);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Vehicle Mode Toggle (Car / Bike) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex-shrink-0">
              <button
                type="button"
                onClick={() => handleVehicleChange('CAR')}
                className={`p-1.5 rounded-xl transition ${
                  vehicleType === 'CAR'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Car Parking"
              >
                <Car className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleVehicleChange('BIKE')}
                className={`p-1.5 rounded-xl transition ${
                  vehicleType === 'BIKE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Bike Parking"
              >
                <Bike className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Area Hotspots */}
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {quickHotspots.map((hotspot) => {
              const isActive = (area === hotspot.area) || (!area && !hotspot.area);
              return (
                <button
                  key={hotspot.label}
                  type="button"
                  onClick={() => handleHotspotClick(hotspot.area, hotspot.coords)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {hotspot.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING ACTION BUTTONS (GPS Locate & AI Concierge)                       */}
      {/* ========================================================================= */}
      <div className="absolute right-4 top-44 z-20 flex flex-col space-y-2.5 pointer-events-auto">
        {/* Current GPS Location Button */}
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={isLocating}
          className="w-11 h-11 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-white/80 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-emerald-600 transition active:scale-95 cursor-pointer"
          title="Locate Me (GPS)"
        >
          {isLocating ? (
            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Crosshair className="w-5 h-5 text-emerald-600" />
          )}
        </button>

        {/* Floating ParkBot AI Concierge Trigger */}
        <button
          type="button"
          onClick={onOpenChat}
          className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer"
          title="Ask ParkBot AI"
        >
          <Bot className="w-5 h-5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SLIDING DRAWER / FOCUSED SPOT CARD                                */}
      {/* Positioned above the curved floating bottom navigation dock               */}
      {/* ========================================================================= */}
      <div className="absolute bottom-20 inset-x-3 max-w-md mx-auto z-20 pointer-events-none">
        
        {/* CASE 1: SPOT SELECTED -> SHOW FOCUSED CARD WITH PRIVACY & CTA */}
        {selectedSpot ? (
          <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[28px] p-4 border border-white/80 dark:border-slate-800 shadow-[0_16px_40px_rgba(0,0,0,0.18)] space-y-3 animate-in fade-in slide-in-from-bottom duration-200">
            
            {/* Top Bar: Title & Close Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                  • {formatApproxDistance(getSpotDistance(selectedSpot))} away
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {selectedSpot.area || city}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setSelectedSpot(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spot Brief Info */}
            <div className="flex items-center space-x-3.5">
              <div className="relative w-20 h-20 min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 shadow-inner">
                <img
                  src={selectedSpot.images[0]?.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=300&q=80'}
                  alt={selectedSpot.title}
                  className="w-full h-full object-cover"
                />
                {selectedSpot.is_covered && (
                  <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-black px-1 py-0.5 rounded">
                    COVERED
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  {selectedSpot.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span>{selectedSpot.parking_type.replace(/_/g, ' ')} • {selectedSpot.city}</span>
                </p>

                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center space-x-0.5 text-xs text-amber-500 font-bold">
                    <Star className="w-3 h-3 fill-amber-500" />
                    <span>{selectedSpot.average_rating || '4.9'}</span>
                  </div>
                  {selectedSpot.has_ev_charging && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center">
                      <Zap className="w-3 h-3 mr-0.5" /> EV Ready
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Notice */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-2.5 flex items-center space-x-2 text-[11px] text-amber-900 dark:text-amber-200">
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="leading-tight">
                <strong>Privacy Protected:</strong> Exact driveway slot & host contact unlock immediately after reservation.
              </span>
            </div>

            {/* Bottom Row: Hourly Price & Reserve CTA Button */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Rate</span>
                <div className="flex items-baseline space-x-0.5">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    ₹{selectedSpot.pricing_rule?.hourly_price || 40}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/hr</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/listing/${selectedSpot.id}`)}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-md shadow-emerald-600/30 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Reserve Spot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* CASE 2: OVERVIEW -> HORIZONTAL CAROUSEL OF NEARBY SPOTS ON MAP */
          <div className="pointer-events-auto bg-white/92 dark:bg-slate-900/92 backdrop-blur-2xl rounded-[28px] p-3 border border-white/80 dark:border-slate-800 shadow-[0_16px_40px_rgba(0,0,0,0.16)] space-y-2">
            
            {/* Header: Available Nearby & Filter Chips */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Parking Nearby
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
                  {filteredListings.length} spots
                </span>
              </div>

              {/* Quick Filters */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setFilterTag(filterTag === 'EV' ? 'ALL' : 'EV')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition ${
                    filterTag === 'EV'
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  ⚡ EV
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTag(filterTag === 'COVERED' ? 'ALL' : 'COVERED')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition ${
                    filterTag === 'COVERED'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Covered
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Mini Spot Cards */}
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400 font-bold flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Locating spaces on map...</span>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="py-5 text-center space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No parking spots listed yet in "{area || city}"
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Try searching a nearby area or select a hotspot like Koramangala or Indiranagar.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setArea('');
                      setSearchInput('');
                      fetchListings(city, '', vehicleType);
                    }}
                    className="inline-flex items-center space-x-1.5 bg-emerald-600 text-white text-[11px] font-extrabold px-3.5 py-1.5 rounded-xl shadow-xs hover:bg-emerald-500 transition cursor-pointer"
                  >
                    <span>Show All Available Spots</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5 overflow-x-auto scrollbar-none py-1 px-0.5">
                {filteredListings.map((spot, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const dist = getSpotDistance(spot);
                  const price = spot.pricing_rule?.hourly_price || 40;
                  const img = spot.images[0]?.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=300&q=80';

                  return (
                    <div
                      key={spot.id}
                      onClick={() => {
                        setSelectedSpot(spot);
                        if (mapInstanceRef.current && spot.latitude && spot.longitude) {
                          mapInstanceRef.current.flyTo([spot.latitude, spot.longitude], 16, { duration: 0.8 });
                        }
                      }}
                      className="flex-shrink-0 w-44 bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-2 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/80 cursor-pointer transition active:scale-95 group shadow-xs"
                    >
                      <div className="relative h-20 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
                        <img
                          src={img}
                          alt={`Parking ${letter}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-1 left-1 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                          🅿️ {letter}
                        </span>
                        <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-xs">
                          {formatApproxDistance(dist)}
                        </span>
                      </div>

                      <div className="pt-1.5 space-y-0.5">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate" title={spot.title}>
                          {spot.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 truncate text-[10px]">
                            {spot.parking_type.replace(/_/g, ' ')}
                          </span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            ₹{price}/hr
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] pt-0.5">
                          <span className={`font-bold ${spot.available_spaces === 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {spot.available_spaces !== undefined
                              ? (spot.available_spaces === 0 ? '🔴 Full' : `🟢 ${spot.available_spaces} left`)
                              : '🟢 Available'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
