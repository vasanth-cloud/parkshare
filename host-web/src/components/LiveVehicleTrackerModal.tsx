import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  Car,
  Bike,
  Shield,
  ShieldAlert,
  Battery,
  Fuel,
  Gauge,
  Radio,
  Lock,
  Unlock,
  RefreshCw,
  X,
  ExternalLink,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Share2
} from 'lucide-react';
import { RentalPartnerVehicle } from '../types';

interface LiveVehicleTrackerModalProps {
  vehicle: RentalPartnerVehicle;
  onClose: () => void;
}

export const LiveVehicleTrackerModal: React.FC<LiveVehicleTrackerModalProps> = ({
  vehicle,
  onClose
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pathPolylineRef = useRef<L.Polyline | null>(null);

  // Default coordinate determination based on hub
  const getInitialCoords = () => {
    const loc = (vehicle.hubAddress || vehicle.city || '').toLowerCase();
    if (loc.includes('indiranagar')) return { lat: 12.9716, lng: 77.6412, area: 'Indiranagar 100ft Road' };
    if (loc.includes('koramangala')) return { lat: 12.9345, lng: 77.6101, area: 'Koramangala 4th Block' };
    if (loc.includes('hsr')) return { lat: 12.9116, lng: 77.6389, area: 'HSR Layout Sector 1' };
    if (loc.includes('whitefield')) return { lat: 12.9863, lng: 77.7378, area: 'Whitefield ITPL Main Rd' };
    return { lat: 12.9352, lng: 77.6245, area: 'Sony World Signal, Koramangala' };
  };

  const initial = getInitialCoords();
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: initial.lat, lng: initial.lng });
  const [currentAddress, setCurrentAddress] = useState(initial.area);
  const [speed, setSpeed] = useState<number>(() => Math.floor(Math.random() * 35) + 20); // 20 - 55 km/h
  const [isDriving, setIsDriving] = useState(true);
  const [engineLocked, setEngineLocked] = useState(false);
  const [fuelPct, setFuelPct] = useState(78);
  const [satellites, setSatellites] = useState(12);
  const [lastPing, setLastPing] = useState('Just now');
  const [isSimulatingLive, setIsSimulatingLive] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([coords.lat, coords.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom pulse radar icon
    const iconHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: ${engineLocked ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 34px; height: 34px; border-radius: 50%; background: ${engineLocked ? '#ef4444' : '#10b981'}; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          ${vehicle.vehicleType === 'BIKE' ? '🏍️' : '🚗'}
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'live-gps-marker',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; padding: 4px;">
        <strong>${vehicle.name}</strong><br/>
        Plate: <code>${vehicle.rcNumber || vehicle.name}</code><br/>
        Status: ${isDriving ? 'In-Trip Driving' : 'Parked'}<br/>
        Speed: <strong>${speed} km/h</strong>
      </div>
    `).openPopup();

    // Route history breadcrumb trail
    const polyline = L.polyline([
      [coords.lat - 0.005, coords.lng - 0.006],
      [coords.lat - 0.003, coords.lng - 0.003],
      [coords.lat - 0.001, coords.lng - 0.001],
      [coords.lat, coords.lng]
    ], {
      color: '#f59e0b',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 8'
    }).addTo(map);

    mapInstanceRef.current = map;
    markerRef.current = marker;
    pathPolylineRef.current = polyline;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Live GPS Simulation Interval (nudges coordinates slightly to simulate live telemetry stream)
  useEffect(() => {
    if (!isSimulatingLive || engineLocked) return;

    const interval = setInterval(() => {
      setCoords(prev => {
        // Small realistic GPS drift (~15-30 meters)
        const dLat = (Math.random() - 0.45) * 0.0003;
        const dLng = (Math.random() - 0.45) * 0.0003;
        const nextLat = prev.lat + dLat;
        const nextLng = prev.lng + dLng;

        if (markerRef.current && mapInstanceRef.current) {
          markerRef.current.setLatLng([nextLat, nextLng]);
          mapInstanceRef.current.panTo([nextLat, nextLng], { animate: true, duration: 1 });
        }

        return { lat: nextLat, lng: nextLng };
      });

      // Update speed & telemetry randomly
      setSpeed(prev => Math.max(15, Math.min(65, prev + (Math.floor(Math.random() * 9) - 4))));
      setLastPing('Live stream active');
    }, 4500);

    return () => clearInterval(interval);
  }, [isSimulatingLive, engineLocked]);

  // Handle remote immobilizer
  const handleToggleEngineLock = () => {
    const nextLocked = !engineLocked;
    setEngineLocked(nextLocked);
    if (nextLocked) {
      setSpeed(0);
      setIsDriving(false);
      showToast('⚠️ Remote Engine Kill Command sent! Vehicle ignition immobilized.');
    } else {
      setIsDriving(true);
      setSpeed(28);
      showToast('✅ Remote Immobilizer Disarmed. Vehicle can be driven.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* 1. Header Bar */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Live GPS Fleet Telematics
                </h3>
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>GPS ONLINE</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{vehicle.name}</span>
                <span>•</span>
                <span className="font-mono text-amber-300 font-bold">{vehicle.rcNumber || vehicle.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                showToast('Pinging OBD-II satellite tracker...');
                setLastPing('Ping received 0.2s ago');
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Ping GPS Tracker"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Toast Notice */}
        {toastMsg && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black text-center animate-in fade-in">
            {toastMsg}
          </div>
        )}

        {/* 3. Main Content: Map + Live Telemetry Cards */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3">
          
          {/* Interactive Map (takes 2 columns on desktop) */}
          <div className="lg:col-span-2 relative h-72 sm:h-96 lg:h-auto min-h-[300px] bg-slate-100 dark:bg-slate-800">
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* Over-Map Telemetry Chip */}
            <div className="absolute top-3 left-3 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-md flex items-center space-x-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E
              </span>
            </div>

            {/* Over-Map Speedometer Badge */}
            <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 text-white backdrop-blur-md p-2.5 rounded-2xl border border-slate-700 shadow-lg flex items-center space-x-3">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Speed</span>
                <span className="text-xl font-black font-mono text-emerald-400 leading-tight">
                  {speed}
                </span>
                <span className="text-[9px] text-slate-400 font-bold">km/h</span>
              </div>
              <div className="h-7 w-px bg-slate-700" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Status</span>
                <span className={`text-xs font-black ${engineLocked ? 'text-rose-400' : 'text-amber-400'}`}>
                  {engineLocked ? 'Immobilized' : isDriving ? 'In Motion' : 'Stationary'}
                </span>
              </div>
            </div>
          </div>

          {/* Telemetry & Controls Side Panel */}
          <div className="p-5 space-y-4 bg-slate-50 dark:bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 overflow-y-auto text-xs">
            
            {/* Live Address Box */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400 font-bold uppercase text-[10px]">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>Current Real-Time Location:</span>
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                {currentAddress}
              </p>
              <div className="text-[10px] text-slate-400 pt-0.5">
                Bengaluru, Karnataka • Accuracy: ±2.4 meters
              </div>
            </div>

            {/* Live Sensor Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase">Fuel / SoC</span>
                  <Fuel className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  {fuelPct}%
                </div>
                <div className="text-[10px] text-emerald-600 font-bold">
                  Est. 280 km range
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase">GNSS Satellites</span>
                  <Radio className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  {satellites} Locked
                </div>
                <div className="text-[10px] text-indigo-500 font-bold">
                  Dual-band GPS
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase">Ignition</span>
                  <Gauge className="w-3.5 h-3.5 text-cyan-500" />
                </div>
                <div className={`text-sm font-black ${engineLocked ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {engineLocked ? 'OFF (Locked)' : 'ON'}
                </div>
                <div className="text-[10px] text-slate-400">
                  OBD-II Connected
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase">Geofence</span>
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  Inside City Zone
                </div>
                <div className="text-[10px] text-slate-400">
                  No alerts triggered
                </div>
              </div>
            </div>

            {/* Anti-Theft Remote Immobilizer Switch */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    {engineLocked ? <Lock className="w-3.5 h-3.5 text-rose-500" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
                    <span>Remote Anti-Theft Kill Switch</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Immediately cut engine ignition power via IoT relay in case of unauthorized deviation
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleEngineLock}
                className={`w-full py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 ${
                  engineLocked
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {engineLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Disarm & Enable Ignition</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Engage Remote Engine Lock</span>
                  </>
                )}
              </button>
            </div>

            {/* Google Maps External Redirect */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Google Maps Navigation</span>
            </a>

            <div className="text-[10px] text-center text-slate-400">
              Telemetry frequency: Every 5s • 4G LTE IoT SIM Active
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default LiveVehicleTrackerModal;
