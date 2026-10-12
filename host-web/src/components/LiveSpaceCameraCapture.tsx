import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Camera, 
  AlertTriangle, 
  RotateCcw, 
  Trash2, 
  X, 
  FlipHorizontal,
  Smartphone,
  Upload,
  Loader2
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
  icon: string;
  isMandatory: (state: { isCovered: boolean; isIndoor: boolean; parkingType: string; hasGatedAccess: boolean }) => boolean;
}

export const PHOTO_SLOTS: PhotoSlotDef[] = [
  {
    key: 'ENTRANCE',
    code: 'ENTRANCE',
    title: 'Road Entrance',
    badgeTitle: 'Required',
    shortDesc: 'Entry from public road',
    icon: '🛣️',
    isMandatory: () => true,
  },
  {
    key: 'PARKING_SLOT',
    code: 'SLOT',
    title: 'Parking Slot',
    badgeTitle: 'Required',
    shortDesc: 'Exact parking bay',
    icon: '🅿️',
    isMandatory: () => true,
  },
  {
    key: 'SURROUNDINGS',
    code: 'SURROUNDINGS',
    title: 'Surroundings',
    badgeTitle: 'Required',
    shortDesc: 'Driveway & turning room',
    icon: '🌐',
    isMandatory: () => true,
  },
  {
    key: 'ROOF_CLEARANCE',
    code: 'ROOF_CLEARANCE',
    title: 'Roof Clearance',
    badgeTitle: 'Covered',
    shortDesc: 'Ceiling & height limit',
    icon: '📏',
    isMandatory: (s) => s.isCovered || s.isIndoor || s.parkingType === 'COVERED_PARKING' || s.parkingType === 'GARAGE',
  },
  {
    key: 'GATE_ENTRY',
    code: 'GATE_ENTRY',
    title: 'Gate / Barrier',
    badgeTitle: 'Gated',
    shortDesc: 'Entry gate or booth',
    icon: '🚪',
    isMandatory: (s) => s.hasGatedAccess,
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
  const [processingSlot, setProcessingSlot] = useState<PhotoAngleKey | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const formState = { isCovered, isIndoor, parkingType, hasGatedAccess };

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
      node.play().catch((e) => console.warn('Autoplay prevented:', e));
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Open live in-browser camera stream
  const openCameraForSlot = async (slotKey: PhotoAngleKey, desiredFacing = facingMode) => {
    stopCameraStream();
    setActiveSlotKey(slotKey);
    setCameraError('');

    // Check if getUserMedia is supported in the current browser/context
    if (!navigator?.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera stream requires HTTPS or localhost. Opening device camera instead...');
      triggerDeviceCamera(slotKey);
      return;
    }

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
      } catch (err: any) {
        setCameraError('In-browser camera access denied. Opening your device camera...');
        triggerDeviceCamera(slotKey);
        return;
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

  // Direct trigger for phone camera / file input
  const triggerDeviceCamera = (slotKey: PhotoAngleKey) => {
    const input = fileInputRefs.current[slotKey];
    if (input) {
      input.click();
    }
  };

  // Watermark helper for canvas
  const applyWatermark = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    slotTitle: string,
    timeStr: string
  ) => {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.fillRect(0, h - 46, w, 46);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, h - 46, w, 3);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`PARKSHARE • ${slotTitle.toUpperCase()}`, 12, h - 25);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px monospace';
    ctx.fillText(`GPS: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)} | ${timeStr} UTC`, 12, h - 10);
  };

  // Capture from live video stream
  const handleCapturePhoto = async () => {
    if (!videoRef.current || !activeSlotKey) return;
    const video = videoRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setCameraError('Camera feed still initializing. Please wait a moment.');
      return;
    }

    setCapturing(true);

    try {
      const maxDim = 1280;
      let w = video.videoWidth;
      let h = video.videoHeight;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(video, 0, 0, w, h);

      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
      const slotDef = PHOTO_SLOTS.find((s) => s.key === activeSlotKey);

      applyWatermark(ctx, w, h, slotDef?.title || activeSlotKey, timeStr);

      const targetKey = activeSlotKey;

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setCameraError('Failed to capture frame');
            setCapturing(false);
            return;
          }

          // Zero-latency instant local preview
          const instantPreviewUrl = URL.createObjectURL(blob);
          const updated = {
            ...photos,
            [targetKey]: {
              url: instantPreviewUrl,
              capturedAt: timeStr,
              angleLabel: slotDef?.title || targetKey,
              gpsCoords: { lat: currentLat, lng: currentLng },
            },
          };
          onPhotosChange(updated);

          stopCameraStream();
          setActiveSlotKey(null);
          setCapturing(false);

          // Upload in background to sync permanent URL
          try {
            const filename = `parking_${targetKey.toLowerCase()}_${Date.now()}.jpg`;
            const uploadRes = await api.uploadFile(blob, filename);
            onPhotosChange({
              ...updated,
              [targetKey]: {
                ...updated[targetKey]!,
                url: uploadRes.url,
              },
            });
          } catch (uploadErr) {
            console.warn('Background upload synced to preview', uploadErr);
          }
        },
        'image/jpeg',
        0.85
      );
    } catch (err: any) {
      setCameraError(err.message || 'Capture failed');
      setCapturing(false);
    }
  };

  // Handle native device camera capture or photo selection
  const handleDeviceFileChange = async (e: React.ChangeEvent<HTMLInputElement>, slotKey: PhotoAngleKey) => {
    const file = e.target.files?.[0];
    // Reset file input value so re-selecting same photo works
    e.target.value = '';
    if (!file) return;

    setProcessingSlot(slotKey);
    setCameraError('');

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image file'));
      });

      const maxDim = 1280;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objectUrl);

      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
      const slotDef = PHOTO_SLOTS.find((s) => s.key === slotKey);

      applyWatermark(ctx, w, h, slotDef?.title || slotKey, timeStr);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setCameraError('Failed to process image');
            setProcessingSlot(null);
            return;
          }

          // Zero-latency instant local preview
          const previewUrl = URL.createObjectURL(blob);
          const updated = {
            ...photos,
            [slotKey]: {
              url: previewUrl,
              capturedAt: timeStr,
              angleLabel: slotDef?.title || slotKey,
              gpsCoords: { lat: currentLat, lng: currentLng },
            },
          };
          onPhotosChange(updated);
          setProcessingSlot(null);

          // Background upload to server
          try {
            const filename = `parking_${slotKey.toLowerCase()}_${Date.now()}.jpg`;
            const uploadRes = await api.uploadFile(blob, filename);
            onPhotosChange({
              ...updated,
              [slotKey]: {
                ...updated[slotKey]!,
                url: uploadRes.url,
              },
            });
          } catch (uploadErr) {
            console.warn('Background upload synced to preview', uploadErr);
          }
        },
        'image/jpeg',
        0.85
      );
    } catch (err: any) {
      setCameraError(err.message || 'Failed to process photo from device');
      setProcessingSlot(null);
    }
  };

  const removePhoto = (slotKey: PhotoAngleKey) => {
    const updated = { ...photos };
    delete updated[slotKey];
    onPhotosChange(updated);
  };

  const visibleSlots = PHOTO_SLOTS.filter(
    (s) => s.key === 'ENTRANCE' || s.key === 'PARKING_SLOT' || s.key === 'SURROUNDINGS' || s.isMandatory(formState)
  );

  return (
    <div className="space-y-3">
      {/* 2-Column Photo Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {visibleSlots.map((slot) => {
          const photo = photos[slot.key];
          const isCaptured = Boolean(photo?.url);
          const isBusy = processingSlot === slot.key;

          return (
            <div
              key={slot.key}
              className={`rounded-2xl border p-2.5 flex flex-col justify-between transition-all ${
                isCaptured
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                  : 'bg-white border-gray-200 hover:border-emerald-300 shadow-2xs'
              }`}
            >
              {/* Hidden file input for native camera capture */}
              <input
                ref={(el) => { fileInputRefs.current[slot.key] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleDeviceFileChange(e, slot.key)}
              />

              {/* Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-900 truncate flex items-center gap-1">
                  <span>{slot.icon}</span>
                  <span>{slot.title}</span>
                </span>
                {isCaptured ? (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                    ✓
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    {slot.badgeTitle}
                  </span>
                )}
              </div>

              {/* Thumbnail or Placeholder */}
              {isCaptured ? (
                <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-black/10 group mb-2 border border-gray-200">
                  <img
                    src={photo!.url}
                    alt={slot.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={() => openCameraForSlot(slot.key)}
                      className="p-1.5 rounded-lg bg-white text-gray-800 text-[10px] font-bold hover:bg-emerald-50 transition cursor-pointer"
                      title="Retake with Live Camera"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerDeviceCamera(slot.key)}
                      className="p-1.5 rounded-lg bg-white text-gray-800 text-[10px] font-bold hover:bg-emerald-50 transition cursor-pointer"
                      title="Retake with Phone Camera / Upload"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(slot.key)}
                      className="p-1.5 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 aspect-4/3 flex flex-col items-center justify-center p-2 text-center mb-2 bg-slate-50/60">
                  {isBusy ? (
                    <div className="flex flex-col items-center gap-1 text-emerald-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-[10px] font-bold">Processing photo...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-xl mb-0.5">{slot.icon}</span>
                      <span className="text-[10px] text-gray-500 font-medium leading-tight">{slot.shortDesc}</span>
                    </>
                  )}
                </div>
              )}

              {/* Dual Action Buttons: Live Camera & Phone Camera / Upload */}
              <div className="space-y-1.5 pt-0.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => openCameraForSlot(slot.key)}
                    className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{isCaptured ? 'Live Retake' : 'Live Cam'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => triggerDeviceCamera(slot.key)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-800 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Smartphone className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">{isCaptured ? 'Device Photo' : 'Device / Upload'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cameraError && (
        <div className="bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-200 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span className="truncate">{cameraError}</span>
          </div>
          <button
            type="button"
            onClick={() => setCameraError('')}
            className="text-[10px] font-bold text-amber-700 underline flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {isCameraActive && activeSlotKey && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/40 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold truncate">
                  {PHOTO_SLOTS.find((s) => s.key === activeSlotKey)?.title}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = facingMode === 'environment' ? 'user' : 'environment';
                    setFacingMode(next);
                    openCameraForSlot(activeSlotKey, next);
                  }}
                  className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                  title="Switch Camera"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setActiveSlotKey(null);
                  }}
                  className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Viewport */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[280px]">
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

              <div className="absolute inset-4 pointer-events-none border border-dashed border-emerald-400/50 rounded-2xl flex items-center justify-center">
                <div className="bg-black/60 px-2.5 py-1 rounded-lg text-[10px] text-emerald-300 font-medium">
                  Align space & tap capture
                </div>
              </div>
            </div>

            {/* Footer with Capture & Device Fallback */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setActiveSlotKey(null);
                  }}
                  className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={capturing}
                  onClick={handleCapturePhoto}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{capturing ? 'Snapping...' : 'Capture Photo'}</span>
                </button>
              </div>

              {/* Instant device camera / file upload fallback */}
              <button
                type="button"
                onClick={() => {
                  const key = activeSlotKey;
                  stopCameraStream();
                  setActiveSlotKey(null);
                  if (key) triggerDeviceCamera(key);
                }}
                className="w-full py-1 text-center text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Smartphone className="w-3 h-3" />
                <span>Camera not opening? Tap here to use Phone Camera / Upload</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
