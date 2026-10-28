import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, MapPin, ExternalLink, Compass } from 'lucide-react';

interface RentalRouteNavigationMapProps {
  customerCoords?: { lat: number; lng: number } | null;
  hostCoords?: { lat: number; lng: number } | null;
  hostAddress: string;
  hostName?: string;
  doorstepAddress?: string;
  className?: string;
}

const DEFAULT_COORDS: Record<string, { lat: number; lng: number }> = {
  indiranagar: { lat: 12.9716, lng: 77.6412 },
  koramangala: { lat: 12.9345, lng: 77.6101 },
  hsr: { lat: 12.9116, lng: 77.6389 },
  whitefield: { lat: 12.9863, lng: 77.7378 },
  dharmapuri: { lat: 12.1277, lng: 78.1579 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
};

function resolveFallbackCoords(address: string): { lat: number; lng: number } {
  const lower = (address || '').toLowerCase();
  for (const [key, coords] of Object.entries(DEFAULT_COORDS)) {
    if (lower.includes(key)) {
      return coords;
    }
  }
  return { lat: 12.9716, lng: 77.6412 }; // Default Bengaluru center
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const RentalRouteNavigationMap: React.FC<RentalRouteNavigationMapProps> = ({
  customerCoords,
  hostCoords,
  hostAddress,
  hostName = 'ParkCo Fleet Host',
  doorstepAddress,
  className = 'h-52',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const destinationAddress = doorstepAddress || hostAddress || 'Bengaluru';

  // Resolved host position
  const hCoords = hostCoords && hostCoords.lat && hostCoords.lng
    ? hostCoords
    : resolveFallbackCoords(hostAddress);

  // Resolved customer position (if not passed, offset slightly from host for demonstration)
  const cCoords = customerCoords && customerCoords.lat && customerCoords.lng
    ? customerCoords
    : { lat: hCoords.lat - 0.012, lng: hCoords.lng - 0.015 };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up previous map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const dist = haversineKm(cCoords.lat, cCoords.lng, hCoords.lat, hCoords.lng);
      setDistanceKm(dist);

      const map = L.map(mapContainerRef.current, {
        center: [(cCoords.lat + hCoords.lat) / 2, (cCoords.lng + hCoords.lng) / 2],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Customer Marker Icon (Blue pulsing dot)
      const customerIcon = L.divIcon({
        className: 'custom-customer-marker',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 28px; height: 28px; background-color: rgba(59, 130, 246, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; background-color: #2563EB; border: 2.5px solid #FFFFFF; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      // Host Hub Marker Icon (Green pin)
      const hostIcon = L.divIcon({
        className: 'custom-host-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="background-color: #059669; color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 900; white-space: nowrap; box-shadow: 0 3px 8px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px;">
              <span>📍 Host Hub</span>
            </div>
            <div style="width: 2px; height: 6px; background-color: #059669;"></div>
          </div>
        `,
        iconSize: [70, 30],
        iconAnchor: [35, 30],
      });

      const customerMarker = L.marker([cCoords.lat, cCoords.lng], { icon: customerIcon }).addTo(map);
      customerMarker.bindPopup('<b style="font-size:11px;">Your Current Location</b>');

      const hostMarker = L.marker([hCoords.lat, hCoords.lng], { icon: hostIcon }).addTo(map);
      hostMarker.bindPopup(`<b style="font-size:11px;">${hostName}</b><br/><span style="font-size:10px;">${hostAddress}</span>`);

      // Draw route connecting both points
      const routeLine = L.polyline(
        [
          [cCoords.lat, cCoords.lng],
          [(cCoords.lat + hCoords.lat) / 2 + 0.002, (cCoords.lng + hCoords.lng) / 2 - 0.002],
          [hCoords.lat, hCoords.lng],
        ],
        {
          color: '#059669',
          weight: 4,
          opacity: 0.85,
          dashArray: '6, 6',
        }
      ).addTo(map);

      // Fit bounds with comfortable padding
      const bounds = L.latLngBounds([
        [cCoords.lat, cCoords.lng],
        [hCoords.lat, hCoords.lng],
      ]);
      map.fitBounds(bounds, { padding: [30, 30] });

      mapInstanceRef.current = map;
    } catch (e) {
      console.warn('Leaflet initialization error:', e);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [cCoords.lat, cCoords.lng, hCoords.lat, hCoords.lng, hostAddress, hostName]);

  const handleOpenGoogleMaps = () => {
    const dest = encodeURIComponent(destinationAddress);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    window.open(url, '_blank');
  };

  const etaMins = distanceKm ? Math.max(2, Math.round((distanceKm / 25) * 60)) : 5;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-emerald-600" />
          <span>Live Route to Host Hub</span>
        </span>
        {distanceKm !== null && (
          <span className="font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/20 text-[11px]">
            📍 {distanceKm} km • ~{etaMins} mins away
          </span>
        )}
      </div>

      <div className={`w-full ${className} rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner`}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        
        {/* Floating badge inside map */}
        <div className="absolute top-2.5 left-2.5 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{hostAddress}</span>
        </div>
      </div>

      {/* One-tap Google Maps Navigation Button */}
      <button
        type="button"
        onClick={handleOpenGoogleMaps}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
      >
        <Navigation className="w-4 h-4" />
        <span>Navigate to Host via Google Maps</span>
        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
      </button>
    </div>
  );
};

