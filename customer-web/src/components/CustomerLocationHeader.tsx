import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ChevronDown, Crosshair, Search, X, Check, Building2, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface CustomerLocationData {
  title: string;
  subtitle: string;
  areaId?: string;
  lat?: number;
  lng?: number;
}

const DEFAULT_LOCATION: CustomerLocationData = {
  title: 'Indiranagar',
  subtitle: 'Bengaluru, Karnataka',
  areaId: 'INDIRANAGAR',
  lat: 12.9784,
  lng: 77.6408,
};

const POPULAR_HUBS: CustomerLocationData[] = [
  { title: 'Indiranagar', subtitle: '100ft Road Metro Hub · Bengaluru', areaId: 'INDIRANAGAR', lat: 12.9784, lng: 77.6408 },
  { title: 'Koramangala', subtitle: '4th Block · Bengaluru', areaId: 'KORAMANGALA', lat: 12.9352, lng: 77.6245 },
  { title: 'HSR Layout', subtitle: 'Sector 1 Hub · Bengaluru', areaId: 'HSR', lat: 12.9121, lng: 77.6446 },
  { title: 'Whitefield', subtitle: 'ITPL Main Hub · Bengaluru', areaId: 'WHITEFIELD', lat: 12.9698, lng: 77.7500 },
  { title: 'Kempegowda Airport', subtitle: 'T1 Rental Bay · Devanahalli', areaId: 'AIRPORT', lat: 13.1986, lng: 77.7066 },
  { title: 'Majestic Central', subtitle: 'Concourse Hub · Central Bengaluru', areaId: 'MAJESTIC', lat: 12.9767, lng: 77.5713 },
  { title: 'MG Road / CBD', subtitle: 'Church Street · Bengaluru', lat: 12.9756, lng: 77.6097 },
  { title: 'Jayanagar', subtitle: '4th Block Complex · Bengaluru', lat: 12.9308, lng: 77.5838 },
  { title: 'BTM Layout', subtitle: 'Outer Ring Road · Bengaluru', lat: 12.9166, lng: 77.6101 },
  { title: 'Anna Nagar', subtitle: '2nd Avenue · Chennai, Tamil Nadu', lat: 13.0850, lng: 80.2101 },
  { title: 'Hitec City', subtitle: 'Madhapur · Hyderabad, Telangana', lat: 17.4435, lng: 78.3772 },
  { title: 'Bandra West', subtitle: 'Hill Road · Mumbai, Maharashtra', lat: 19.0596, lng: 72.8295 },
];

export const CustomerLocationHeader: React.FC = () => {
  const { user } = useAuth();
  const [currentLoc, setCurrentLoc] = useState<CustomerLocationData>(() => {
    try {
      const saved = localStorage.getItem('parkshare_customer_location');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    const u = user as any;
    if (u?.city) {
      return {
        title: u.city,
        subtitle: [u.address, u.state].filter(Boolean).join(', ') || 'India',
      };
    }
    return DEFAULT_LOCATION;
  });

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    const handleLocationUpdate = (e: CustomEvent<CustomerLocationData>) => {
      if (e.detail) setCurrentLoc(e.detail);
    };
    window.addEventListener('parkshare_location_updated' as any, handleLocationUpdate);
    return () => {
      window.removeEventListener('parkshare_location_updated' as any, handleLocationUpdate);
    };
  }, []);

  const selectLocation = (loc: CustomerLocationData) => {
    setCurrentLoc(loc);
    try {
      localStorage.setItem('parkshare_customer_location', JSON.stringify(loc));
      window.dispatchEvent(new CustomEvent('parkshare_location_updated', { detail: loc }));
    } catch {
      // ignore
    }
    setIsOpen(false);
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your device browser.');
      return;
    }
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let title = 'Current Location';
        let subtitle = `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)} · Live GPS`;
        let areaId: string | undefined = undefined;

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            const neighborhood = data?.address?.suburb || data?.address?.neighbourhood || data?.address?.residential || data?.address?.road;
            const city = data?.address?.city || data?.address?.town || data?.address?.county;
            if (neighborhood) title = neighborhood;
            if (city) subtitle = [neighborhood, city].filter(Boolean).join(', ');
          }
        } catch {
          // fallback to coordinates
        }

        // Check if close to known hub
        const knownHubs = [
          { id: 'INDIRANAGAR', name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
          { id: 'KORAMANGALA', name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
          { id: 'HSR', name: 'HSR Layout', lat: 12.9121, lng: 77.6446 },
          { id: 'WHITEFIELD', name: 'Whitefield', lat: 12.9698, lng: 77.7500 },
          { id: 'AIRPORT', name: 'Airport Hub', lat: 13.1986, lng: 77.7066 },
          { id: 'MAJESTIC', name: 'Majestic Central', lat: 12.9767, lng: 77.5713 },
        ];
        let closest = knownHubs[0];
        let minDist = 999999;
        for (const h of knownHubs) {
          const d = Math.hypot(h.lat - lat, h.lng - lng);
          if (d < minDist) {
            minDist = d;
            closest = h;
          }
        }
        if (minDist < 0.15) {
          areaId = closest.id;
        }

        setIsDetecting(false);
        selectLocation({
          title,
          subtitle,
          areaId,
          lat,
          lng,
        });
      },
      () => {
        setIsDetecting(false);
        selectLocation(DEFAULT_LOCATION);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const filteredHubs = POPULAR_HUBS.filter(
    (h) =>
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Top Bar Location Trigger - Swiggy/Zomato Aesthetic (Matching Host Side) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 text-left group cursor-pointer max-w-[200px] sm:max-w-xs transition p-1 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
        title="Tap to change location"
      >
        <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-100 dark:border-emerald-800/60 shadow-2xs">
          <MapPin className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-emerald-600/20 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
        </div>
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center space-x-1">
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition leading-snug">
              {currentLoc.title}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition shrink-0" />
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[130px] sm:max-w-[210px] leading-tight">
            {currentLoc.subtitle}
          </span>
        </div>
      </button>

      {/* Location Selector Modal */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-5 duration-200">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Select Your Location
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Find parking, rental rides & chauffeur services nearby
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 pb-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search area, landmark or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Use Current GPS Location Button */}
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isDetecting}
                  className="w-full mt-3 flex items-center space-x-3 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Crosshair className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-extrabold text-emerald-900 dark:text-emerald-200">
                      {isDetecting ? 'Detecting via GPS...' : 'Use Current Location'}
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                      Using device GPS for precise nearby services
                    </div>
                  </div>
                </button>
              </div>

              {/* Hubs / Locations List */}
              <div className="p-4 pt-2 overflow-y-auto space-y-1.5 flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-1 pt-1 pb-1">
                  Popular Hubs & Localities
                </div>
                {filteredHubs.map((hub, idx) => {
                  const isSelected = currentLoc.title === hub.title;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectLocation(hub)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold truncate">
                            {hub.title}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                            {hub.subtitle}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}

                {searchQuery.trim() && filteredHubs.length === 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      selectLocation({
                        title: searchQuery.trim(),
                        subtitle: 'Custom Search Location',
                      })
                    }
                    className="w-full p-3 rounded-2xl text-left bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center space-x-2"
                  >
                    <Navigation className="w-4 h-4 text-emerald-600" />
                    <span>Set "{searchQuery.trim()}" as location</span>
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default CustomerLocationHeader;
