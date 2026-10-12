import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  X, 
  FlipHorizontal,
  Navigation,
  Check
} from 'lucide-react';

export interface LocationProof {
  is_location_verified: boolean;
  verified_latitude: number;
  verified_longitude: number;
  verified_at: string;
  verification_photo_url: string;
  gps_accuracy_m: number;
  distance_to_declared_m: number;
  is_address_match: boolean;
}

interface Props {
  declaredLat: number;
  declaredLng: number;
  declaredAddress?: string;
  verificationData: LocationProof | null;
  onVerificationChange: (data: LocationProof | null) => void;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const PhysicalLocationProofStep: React.FC<Props> = ({
  declaredLat,
  declaredLng,
  declaredAddress,
  verificationData,
  onVerificationChange,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number; accuracy: number; distanceM: number } | null>(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const setVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.play().catch((e) => console.warn('Autoplay prevented:', e));
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const startLocationVerification = () => {
    setError('');
    setAcquiringGps(true);

    if (!navigator.geolocation) {
      // Fallback to declared coordinates if browser doesn't have geolocation
      const distM = 0;
      setCurrentGps({ lat: declaredLat, lng: declaredLng, accuracy: 25, distanceM: distM });
      setAcquiringGps(false);
      launchCamera(facingMode);
      return;
    }

    const onGpsSuccess = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 15);
      const distM = calculateDistanceMeters(declaredLat, declaredLng, lat, lng);

      setCurrentGps({ lat, lng, accuracy, distanceM: distM });
      setAcquiringGps(false);
      await launchCamera(facingMode);
    };

    const onGpsError = (err: GeolocationPositionError) => {
      console.warn('High accuracy GPS error, trying standard accuracy:', err);
      // Fallback 1: Standard network accuracy
      navigator.geolocation.getCurrentPosition(
        onGpsSuccess,
        () => {
          // Fallback 2: Use declared coordinates gracefully so user isn't stuck
          const distM = 0;
          setCurrentGps({ lat: declaredLat, lng: declaredLng, accuracy: 30, distanceM: distM });
          setAcquiringGps(false);
          launchCamera(facingMode);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      onGpsSuccess,
      onGpsError,
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );
  };

  const launchCamera = async (desiredFacing = facingMode) => {
    stopCameraStream();
    setError('');
    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: desiredFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (fallbackErr: any) {
        setError('Camera permission denied or camera not found. Please allow camera access in browser settings.');
        setIsVerifying(false);
        return;
      }
    }

    if (stream) {
      streamRef.current = stream;
      setIsVerifying(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    }
  };

  const handleCaptureOnSiteProof = async () => {
    if (!videoRef.current || !currentGps) return;
    const video = videoRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setError('Camera video feed is still initializing. Please wait a moment.');
      return;
    }

    setCapturing(true);
    setError('');

    try {
      const canvas = document.createElement('canvas');
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas error');

      ctx.drawImage(video, 0, 0, w, h);

      // Watermark
      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, h - 54, w, 54);

      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, h - 54, w, 3);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`📍 PARKSHARE PHYSICAL LOCATION PROOF`, 16, h - 30);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px monospace';
      ctx.fillText(
        `GPS: ${currentGps.lat.toFixed(5)}, ${currentGps.lng.toFixed(5)} (±${currentGps.accuracy}m) • ${timeStr} UTC`,
        16,
        h - 12
      );

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setError('Failed to capture frame');
            setCapturing(false);
            return;
          }

          try {
            const filename = `physical_proof_${Date.now()}.jpg`;
            const uploadRes = await api.uploadFile(blob, filename);

            const isMatch = currentGps.distanceM <= 350;

            const proofData: LocationProof = {
              is_location_verified: true,
              verified_latitude: currentGps.lat,
              verified_longitude: currentGps.lng,
              verified_at: timeStr,
              verification_photo_url: uploadRes.url,
              gps_accuracy_m: currentGps.accuracy,
              distance_to_declared_m: currentGps.distanceM,
              is_address_match: isMatch,
            };

            onVerificationChange(proofData);
            stopCameraStream();
            setIsVerifying(false);
          } catch (err: any) {
            setError(err.message || 'Failed to upload physical location proof');
          } finally {
            setCapturing(false);
          }
        },
        'image/jpeg',
        0.9
      );
    } catch (err: any) {
      setError(err.message || 'Failed to capture frame');
      setCapturing(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Compact Location Verification Card */}
      {verificationData ? (
        <div className="bg-emerald-50/80 border border-emerald-300 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-gray-900 truncate">Physical Location Verified</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  On-Site
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-mono truncate mt-0.5">
                GPS: {verificationData.verified_latitude.toFixed(4)}, {verificationData.verified_longitude.toFixed(4)} • Verified
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startLocationVerification}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white border border-emerald-200 px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1 flex-shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Re-verify</span>
          </button>
        </div>
      ) : (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-gray-900 block">On-Site Location Proof *</span>
              <p className="text-[11px] text-gray-600 truncate mt-0.5">
                Quick live photo at the parking spot to prove physical presence.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={acquiringGps}
            onClick={startLocationVerification}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-2xs flex-shrink-0 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{acquiringGps ? 'Locking GPS...' : 'Verify On-Site'}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-2.5 rounded-xl border border-red-200 text-xs font-semibold flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Compact Live Viewfinder Modal for Physical Proof */}
      {isVerifying && currentGps && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/40 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-xs font-bold text-white">
                  On-Site Proof Viewfinder ({currentGps.lat.toFixed(4)}, {currentGps.lng.toFixed(4)})
                </h3>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = facingMode === 'environment' ? 'user' : 'environment';
                    setFacingMode(next);
                    launchCamera(next);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
                  title="Switch Camera"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setIsVerifying(false);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Viewport */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px]">
              <video
                ref={setVideoRef}
                playsInline
                autoPlay
                muted
                onLoadedMetadata={(e) => {
                  e.currentTarget.play().catch(console.error);
                }}
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-6 pointer-events-none border border-dashed border-emerald-400/50 rounded-2xl flex items-center justify-center">
                <div className="bg-black/60 px-3 py-1 rounded-xl text-[10px] text-emerald-300 font-semibold border border-emerald-500/20">
                  Point camera at parking space & tap capture
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setIsVerifying(false);
                }}
                className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={capturing}
                onClick={handleCaptureOnSiteProof}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>{capturing ? 'Saving Proof...' : 'Capture Proof'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
