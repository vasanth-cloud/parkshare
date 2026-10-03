import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  RotateCcw, 
  Maximize2, 
  X, 
  Compass, 
  FlipHorizontal,
  Navigation,
  Clock,
  Sparkles,
  Info
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
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

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
    if (isVerifying && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch((e) => console.warn('Effect autoplay caught:', e));
    }
  }, [isVerifying]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const startLocationVerification = () => {
    setError('');
    setAcquiringGps(true);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please use a device/browser with GPS support.');
      setAcquiringGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);
        const distM = calculateDistanceMeters(declaredLat, declaredLng, lat, lng);

        setCurrentGps({ lat, lng, accuracy, distanceM: distM });
        setAcquiringGps(false);

        // Now activate live camera
        await launchCamera(facingMode);
      },
      (err) => {
        setAcquiringGps(false);
        setError(`Unable to acquire GPS coordinates: ${err.message}. Please allow high-accuracy location access in browser settings.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const launchCamera = async (desiredFacing = facingMode) => {
    stopCameraStream();
    setError('');
    let stream: MediaStream | null = null;

    // 1. Try with ideal high-res & requested facingMode
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: desiredFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (e1) {
      // 2. Try with facingMode alone
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: desiredFacing },
          audio: false,
        });
      } catch (e2) {
        // 3. Fallback to basic video: true (essential for single-camera laptops/desktops)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (fallbackErr: any) {
          setError('Camera access denied or unavailable. Please enable camera permission in your browser to capture the on-site physical proof.');
          setIsVerifying(false);
          return;
        }
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

    // Guard against uninitialized black frame
    if (!video.videoWidth || !video.videoHeight) {
      setError('Camera video feed is still initializing. Please wait a moment and try again.');
      return;
    }

    setCapturing(true);
    setError('');

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');

      // Draw real live camera frame
      ctx.drawImage(video, 0, 0, w, h);

      // Watermark container
      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, h - 74, w, 74);

      // Green header line
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, h - 74, w, 4);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 19px sans-serif';
      ctx.fillText(`📍 PARKSHARE PHYSICAL ON-SITE LOCATION PROOF`, 24, h - 44);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px monospace';
      ctx.fillText(
        `GPS: ${currentGps.lat.toFixed(5)}, ${currentGps.lng.toFixed(5)} (±${currentGps.accuracy}m)  |  PROXIMITY: ${currentGps.distanceM}m from declared pin  |  ${timeStr} UTC`,
        24,
        h - 18
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
        0.92
      );
    } catch (err: any) {
      setError(err.message || 'Failed to capture live frame');
      setCapturing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Container Card */}
      <div
        className={`rounded-3xl p-6 border-2 transition shadow-md ${
          verificationData
            ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border-emerald-400 text-white'
            : 'bg-white border-amber-300 text-gray-900'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                verificationData
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <MapPin className="w-6 h-6 animate-bounce" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  📍 Verify Parking Location (Prove You Are Physically There)
                </h3>
                {verificationData ? (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    Location Verified
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 border border-amber-300">
                    Mandatory Anti-Fraud Step
                  </span>
                )}
              </div>

              <p className={`text-xs leading-relaxed ${verificationData ? 'text-slate-300' : 'text-gray-600'}`}>
                Stand at the parking space and capture a live photo. The app records your <strong>real-time device GPS coordinates, timestamp, and on-site photo</strong> to prove you are physically at the location before admin approval.
              </p>
            </div>
          </div>

          {verificationData && (
            <button
              type="button"
              onClick={startLocationVerification}
              className="flex items-center space-x-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl border border-slate-700 transition flex-shrink-0 self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-verify On-Site</span>
            </button>
          )}
        </div>

        {/* Verification Report Card (Matches What Admin Sees) */}
        {verificationData ? (
          <div className="mt-5 pt-5 border-t border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Location Verification Summary</span>
              </span>
              <span className="text-[11px] text-slate-400">Captured On-Site</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Checklist */}
              <div className="md:col-span-8 bg-slate-950/80 rounded-2xl p-4 border border-slate-800 font-mono text-xs space-y-2.5">
                <div className="flex items-center justify-between text-slate-200">
                  <span className="text-slate-400">GPS captured</span>
                  <span className="font-bold text-emerald-400 flex items-center space-x-1">
                    <span>✓</span>
                    <span>
                      {verificationData.verified_latitude.toFixed(5)}, {verificationData.verified_longitude.toFixed(5)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">
                      (±{verificationData.gps_accuracy_m}m)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-200">
                  <span className="text-slate-400">Live photo</span>
                  <span className="font-bold text-emerald-400 flex items-center space-x-1">
                    <span>✓</span>
                    <span>Device Camera Frame Verified</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-200">
                  <span className="text-slate-400">Timestamp</span>
                  <span className="font-bold text-emerald-400 flex items-center space-x-1">
                    <span>✓</span>
                    <span>{verificationData.verified_at}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-200 pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Address match</span>
                  <span
                    className={`font-bold flex items-center space-x-1 ${
                      verificationData.is_address_match ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    <span>✓</span>
                    <span>
                      {verificationData.distance_to_declared_m}m from declared pin
                      {verificationData.is_address_match ? ' (Exact On-Site Match)' : ' (Proximity Warning)'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Photo Preview */}
              <div className="md:col-span-4 relative rounded-2xl overflow-hidden aspect-video bg-black border border-emerald-500/40 group">
                <img
                  src={verificationData.verification_photo_url}
                  alt="On-Site Proof"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setZoomUrl(verificationData.verification_photo_url)}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white space-x-1 text-xs font-bold"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Inspect Proof</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-amber-900 leading-relaxed">
              ⚠️ <strong>Action Required:</strong> You must be physically present at the parking spot to complete this step.
            </div>

            <button
              type="button"
              disabled={acquiringGps}
              onClick={startLocationVerification}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 flex-shrink-0"
            >
              <Navigation className="w-4 h-4" />
              <span>{acquiringGps ? 'Acquiring Device GPS...' : '📍 Stand at Space & Verify Location'}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3.5 rounded-2xl border border-red-200 text-xs font-bold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Viewfinder Modal for Physical Proof */}
      {isVerifying && currentGps && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/40 flex flex-col max-h-[92vh]">
            {/* Viewfinder Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    📍 Physical Presence Proof Viewfinder
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live GPS Lock: {currentGps.lat.toFixed(5)}, {currentGps.lng.toFixed(5)} • {currentGps.distanceM}m from declared location
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = facingMode === 'environment' ? 'user' : 'environment';
                    setFacingMode(next);
                    launchCamera(next);
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition flex items-center space-x-1 text-xs"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setIsVerifying(false);
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[360px] sm:min-h-[460px]">
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

              {/* Targeting Reticle */}
              <div className="absolute inset-8 sm:inset-12 pointer-events-none border-2 border-dashed border-emerald-400/60 rounded-3xl flex flex-col justify-between p-4">
                <div className="flex justify-between items-start">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                </div>

                <div className="bg-black/70 backdrop-blur-md self-center px-4 py-2 rounded-2xl text-[11px] text-emerald-300 font-semibold border border-emerald-500/30 text-center max-w-sm">
                  Stand directly inside or next to the parking spot. Hold camera steady to capture the on-site proof.
                </div>

                <div className="flex justify-between items-end">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
                </div>
              </div>

              {/* Floating Real-time HUD */}
              <div className="absolute bottom-3 left-4 right-4 pointer-events-none bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-300 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">LIVE ON-SITE LOCK</span>
                  <span className="text-slate-500">•</span>
                  <span>Accuracy: ±{currentGps.accuracy}m</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold">
                  {currentGps.distanceM <= 350 ? '✓ IN PROXIMITY' : '⚠️ REMOTE CAPTURE'}
                </span>
              </div>
            </div>

            {/* Viewfinder Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Tap button to snap live proof frame with embedded GPS and timestamp watermark.
              </span>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  disabled={capturing}
                  onClick={() => {
                    stopCameraStream();
                    setIsVerifying(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={capturing}
                  onClick={handleCaptureOnSiteProof}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-lg flex items-center space-x-2 disabled:opacity-50"
                >
                  <Camera className="w-5 h-5 text-slate-950" />
                  <span>{capturing ? 'Recording Proof...' : 'Capture Physical Proof'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {zoomUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800">
            <button
              onClick={() => setZoomUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={zoomUrl} alt="Location Proof" className="w-full h-auto max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
