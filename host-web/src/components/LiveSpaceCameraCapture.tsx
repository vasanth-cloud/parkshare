import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Trash2, 
  ShieldCheck, 
  Maximize2, 
  Eye, 
  X, 
  FlipHorizontal,
  Compass,
  Sparkles,
  Info
} from 'lucide-react';

export type PhotoAngleKey = 'ENTRANCE' | 'PARKING_SLOT' | 'SURROUNDINGS' | 'ROOF_CLEARANCE' | 'GATE_ENTRY';

export interface CapturedPhoto {
  url: string;
  capturedAt: string;
  angleLabel: string;
  gpsCoords?: { lat: number; lng: number };
}

interface PhotoSlotDef {
  key: PhotoAngleKey;
  code: string;
  title: string;
  badgeTitle: string;
  shortDesc: string;
  guidelines: string;
  icon: string;
  isMandatory: (state: { isCovered: boolean; isIndoor: boolean; parkingType: string; hasGatedAccess: boolean }) => boolean;
  conditionalReason?: string;
}

export const PHOTO_SLOTS: PhotoSlotDef[] = [
  {
    key: 'ENTRANCE',
    code: 'ENTRANCE',
    title: 'Entrance from Road',
    badgeTitle: 'MANDATORY',
    shortDesc: 'Entryway from the street / access road',
    guidelines: 'Stand on the access road facing the driveway or entry gate. Show how a vehicle turns in from the public road.',
    icon: '🛣️',
    isMandatory: () => true,
  },
  {
    key: 'PARKING_SLOT',
    code: 'SLOT',
    title: 'Actual Parking Slot',
    badgeTitle: 'MANDATORY',
    shortDesc: 'Exact parking bay / demarcated spot',
    guidelines: 'Frame the exact parking bay where the vehicle will stand. Ensure markings, surface quality, and boundaries are clear.',
    icon: '🅿️',
    isMandatory: () => true,
  },
  {
    key: 'SURROUNDINGS',
    code: 'SURROUNDINGS',
    title: 'Wider View & Surroundings',
    badgeTitle: 'MANDATORY',
    shortDesc: 'Surrounding driveway, building & turning clearance',
    guidelines: 'Step back to take a wide-angle shot showing the driveway, nearby building or walls, lighting, and turning room.',
    icon: '🌐',
    isMandatory: () => true,
  },
  {
    key: 'ROOF_CLEARANCE',
    code: 'ROOF_CLEARANCE',
    title: 'Roof / Height-Clearance Photo',
    badgeTitle: 'REQUIRED FOR COVERED',
    shortDesc: 'Overhead beams, ceiling, or height barrier',
    guidelines: 'Aim camera towards the ceiling / overhead beams / pipes to confirm maximum vertical clearance for SUVs and tall vehicles.',
    icon: '📏',
    isMandatory: (s) => s.isCovered || s.isIndoor || s.parkingType === 'COVERED_PARKING' || s.parkingType === 'GARAGE',
    conditionalReason: 'Mandatory because covered / indoor / garage parking is selected.',
  },
  {
    key: 'GATE_ENTRY',
    code: 'GATE_ENTRY',
    title: 'Gate / Entry Area',
    badgeTitle: 'REQUIRED FOR GATED',
    shortDesc: 'Boom barrier, security booth, or access gate',
    guidelines: 'Capture the access gate, boom barrier, RFID scanner, or security cabin so drivers know where to stop upon arrival.',
    icon: '🚪',
    isMandatory: (s) => s.hasGatedAccess,
    conditionalReason: 'Mandatory because gated access is selected.',
  },
];

interface Props {
  photos: Partial<Record<PhotoAngleKey, CapturedPhoto>>;
  onPhotosChange: (photos: Partial<Record<PhotoAngleKey, CapturedPhoto>>) => void;
  isCovered: boolean;
  isIndoor: boolean;
  parkingType: string;
  hasGatedAccess: boolean;
  currentLat: number;
  currentLng: number;
}

export const LiveSpaceCameraCapture: React.FC<Props> = ({
  photos,
  onPhotosChange,
  isCovered,
  isIndoor,
  parkingType,
  hasGatedAccess,
  currentLat,
  currentLng,
}) => {
  const [activeSlotKey, setActiveSlotKey] = useState<PhotoAngleKey | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formState = { isCovered, isIndoor, parkingType, hasGatedAccess };

  // Stop camera tracks cleanly
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const setVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.play().catch((e) => console.warn('Autoplay caught:', e));
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch((e) => console.warn('Effect autoplay caught:', e));
    }
  }, [isCameraActive]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const openCameraForSlot = async (slotKey: PhotoAngleKey, desiredFacing = facingMode) => {
    setActiveSlotKey(slotKey);
    setCameraError('');
    stopCameraStream();

    let stream: MediaStream | null = null;

    try {
      // 1. Try high-definition with desired facing mode
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: desiredFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err1) {
      // 2. Try simple facingMode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: desiredFacing },
          audio: false,
        });
      } catch (err2) {
        // 3. Fallback to basic video: true (e.g. laptop webcam where facingMode might fail)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err3) {
          setCameraError(
            'Live camera access was denied or is unavailable on this device. Please grant camera permission in your browser to take live real photos.'
          );
          setIsCameraActive(false);
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    }
  };

  const switchCameraFacing = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    if (activeSlotKey) {
      await openCameraForSlot(activeSlotKey, newFacing);
    }
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current || !activeSlotKey) return;
    const video = videoRef.current;

    // Prevent uninitialized black image capture
    if (!video.videoWidth || !video.videoHeight) {
      setCameraError('Camera video feed is still initializing. Please wait a moment and try again.');
      return;
    }

    setCapturing(true);
    setCameraError('');

    try {
      const canvas = document.createElement('canvas');
      const w = video.videoWidth;
      const h = video.videoHeight;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not access canvas context');

      // Draw the live video frame
      ctx.drawImage(video, 0, 0, w, h);

      // Burn anti-fraud security watermark on image
      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
      const slotDef = PHOTO_SLOTS.find((s) => s.key === activeSlotKey);

      // Watermark container bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, h - 64, w, 64);

      // Top decorative border for watermark
      ctx.fillStyle = '#10b981'; // emerald-500
      ctx.fillRect(0, h - 64, w, 3);

      // Left text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`PARKSHARE LIVE VERIFIED • ${slotDef?.title.toUpperCase()}`, 24, h - 38);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px monospace';
      ctx.fillText(`GPS: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}  |  CAPTURED: ${timeStr} UTC  |  ANTI-FRAUD ON-SITE`, 24, h - 16);

      // Convert to blob and upload directly
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setCameraError('Failed to capture image frame');
            setCapturing(false);
            return;
          }

          try {
            const filename = `parking_${activeSlotKey.toLowerCase()}_${Date.now()}.jpg`;
            const uploadRes = await api.uploadFile(blob, filename);

            const updated = {
              ...photos,
              [activeSlotKey]: {
                url: uploadRes.url,
                capturedAt: timeStr,
                angleLabel: slotDef?.title || activeSlotKey,
                gpsCoords: { lat: currentLat, lng: currentLng },
              },
            };

            onPhotosChange(updated);
            stopCameraStream();
            setActiveSlotKey(null);
          } catch (err: any) {
            setCameraError(err.message || 'Failed to upload live captured photo.');
          } finally {
            setCapturing(false);
          }
        },
        'image/jpeg',
        0.92
      );
    } catch (err: any) {
      setCameraError(err.message || 'Failed to capture live photo frame');
      setCapturing(false);
    }
  };

  const removePhoto = (slotKey: PhotoAngleKey) => {
    const updated = { ...photos };
    delete updated[slotKey];
    onPhotosChange(updated);
  };

  // Determine slot statuses
  const mandatorySlots = PHOTO_SLOTS.filter((s) => s.isMandatory(formState));
  const capturedMandatoryCount = mandatorySlots.filter((s) => photos[s.key]?.url).length;
  const allMandatoryCaptured = capturedMandatoryCount === mandatorySlots.length;

  return (
    <div className="space-y-6">
      {/* Anti-Fraud Security Directive Box */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/30 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-inner">
              <Camera className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white tracking-wide">
                  Live Camera Space Photos (Mandatory Anti-Fraud Policy)
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Real Camera Only
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                To guarantee driver trust and prevent fraudulent or misleading listings, photos of the parking space <strong>must be captured using your device's live camera on-site</strong>.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end flex-shrink-0">
            <span className="text-xs text-slate-400 font-medium">Compliance</span>
            <span className={`text-base font-black ${allMandatoryCaptured ? 'text-emerald-400' : 'text-amber-400'}`}>
              {capturedMandatoryCount} / {mandatorySlots.length} Captured
            </span>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 flex items-start space-x-2.5 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-amber-300">Strict Moderation Notice:</strong> Photos must be taken recently and must clearly show the actual parking location. Screenshots, downloaded internet images, stock photos, and unrelated uploads <strong>will be rejected</strong> by our moderation team.
          </div>
        </div>

        {/* Mandatory Angle Status Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-700/60">
          {PHOTO_SLOTS.map((slot) => {
            const isMandatory = slot.isMandatory(formState);
            const isCaptured = !!photos[slot.key]?.url;

            return (
              <div
                key={slot.key}
                className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between transition ${
                  isCaptured
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : isMandatory
                    ? 'bg-slate-900/80 border-amber-500/50 text-amber-200'
                    : 'bg-slate-900/40 border-slate-700/40 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{slot.icon}</span>
                  {isCaptured ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isMandatory ? (
                    <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                      Required
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-500">Optional</span>
                  )}
                </div>
                <span className="font-bold text-[11px] truncate">{slot.title}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {isCaptured ? '✓ Live Captured' : isMandatory ? 'Pending photo' : 'Not needed'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid of Photo Angle Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PHOTO_SLOTS.map((slot) => {
          const isMandatory = slot.isMandatory(formState);
          const captured = photos[slot.key];
          const hasPhoto = !!captured?.url;

          return (
            <div
              key={slot.key}
              className={`bg-white rounded-3xl p-5 border-2 transition shadow-sm flex flex-col justify-between space-y-4 ${
                hasPhoto
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : isMandatory
                  ? 'border-amber-300 hover:border-amber-400'
                  : 'border-gray-200 hover:border-gray-300 opacity-90'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl p-2 bg-gray-100 rounded-2xl flex-shrink-0">{slot.icon}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-gray-900">{slot.title}</h4>
                      {isMandatory ? (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          {slot.badgeTitle}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{slot.shortDesc}</p>
                    {slot.conditionalReason && isMandatory && (
                      <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center space-x-1">
                        <Info className="w-3 h-3 flex-shrink-0" />
                        <span>{slot.conditionalReason}</span>
                      </p>
                    )}
                  </div>
                </div>

                {hasPhoto && (
                  <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl flex-shrink-0 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                )}
              </div>

              {/* Guidelines / Helper */}
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100 leading-relaxed">
                💡 <span className="font-semibold text-gray-800">Framing Guide:</span> {slot.guidelines}
              </div>

              {/* Visual Body: Photo Preview OR Live Camera Trigger */}
              {hasPhoto ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden group aspect-video bg-black border border-emerald-300">
                    <img
                      src={captured.url}
                      alt={slot.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-between p-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold bg-emerald-500/90 text-white px-2 py-0.5 rounded-full shadow flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Live Camera Capture</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewZoomUrl(captured.url)}
                          className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition"
                          title="Zoom Photo"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-white space-y-0.5">
                        <div className="font-bold flex items-center space-x-1">
                          <span>{slot.title}</span>
                        </div>
                        <div className="text-[10px] text-emerald-200">
                          Captured: {captured.capturedAt}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => openCameraForSlot(slot.key)}
                      className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 border border-gray-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake with Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(slot.key)}
                      className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition border border-red-200"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-gray-50/50 flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-400">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-800">No Photo Captured</div>
                      <div className="text-[11px] text-gray-500">Live device camera required</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCameraForSlot(slot.key)}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm ${
                      isMandatory
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Open Live Camera for {slot.title}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Camera Viewfinder Modal */}
      {isCameraActive && activeSlotKey && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/40 flex flex-col max-h-[92vh]">
            {/* Viewfinder Header */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <span>Live Viewfinder:</span>
                    <span className="text-emerald-400">
                      {PHOTO_SLOTS.find((s) => s.key === activeSlotKey)?.title}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live device stream • File upload disabled to prevent fake listings
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={switchCameraFacing}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition flex items-center space-x-1 text-xs"
                  title="Switch Front/Back Camera"
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Flip</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setActiveSlotKey(null);
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Viewport with Targeting Overlay */}
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

              {/* Viewfinder framing guide */}
              <div className="absolute inset-8 sm:inset-12 pointer-events-none border-2 border-dashed border-emerald-400/50 rounded-2xl flex flex-col justify-between p-4">
                <div className="flex justify-between items-start">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                </div>

                <div className="bg-black/60 backdrop-blur-sm self-center px-4 py-1.5 rounded-full text-[11px] text-emerald-300 font-semibold border border-emerald-500/30 text-center max-w-md">
                  {PHOTO_SLOTS.find((s) => s.key === activeSlotKey)?.guidelines}
                </div>

                <div className="flex justify-between items-end">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
                </div>
              </div>

              {/* Anti-Fraud Watermark Live Indicator */}
              <div className="absolute bottom-3 left-4 right-4 pointer-events-none bg-slate-950/80 backdrop-blur-sm p-2 rounded-xl border border-slate-800 text-[10px] text-slate-300 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-white">REAL ON-SITE CAPTURE</span>
                  <span className="text-slate-500">•</span>
                  <span>GPS: {currentLat.toFixed(4)}, {currentLng.toFixed(4)}</span>
                </div>
                <span className="text-emerald-400 font-mono">LIVE FEED</span>
              </div>
            </div>

            {/* Viewfinder Footer & Shutter Action */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                Ensure steady lighting and no reflections. The captured photo will be watermarked and validated.
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={capturing}
                  onClick={() => {
                    stopCameraStream();
                    setActiveSlotKey(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={capturing}
                  onClick={handleCapturePhoto}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Camera className="w-5 h-5 text-slate-950" />
                  <span>{capturing ? 'Capturing & Uploading...' : 'Capture Photo'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Error Message */}
      {cameraError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 text-xs font-semibold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {previewZoomUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800">
            <button
              onClick={() => setPreviewZoomUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={previewZoomUrl} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
