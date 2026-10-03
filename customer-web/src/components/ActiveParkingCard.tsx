import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { api } from '../services/api';
import { Booking } from '../types';
import {
  Navigation,
  QrCode,
  Phone,
  Square,
  MapPin,
  X,
  Camera,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Car,
  KeyRound,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  SwitchCamera,
  RefreshCw,
  Crosshair,
  Video,
  Radio
} from 'lucide-react';

export const ActiveParkingCard: React.FC<{ booking: Booking; onRefresh: () => void }> = ({ booking, onRefresh }) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding] = useState(false);

  // Live Camera Viewfinder state
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState('');
  const [liveClock, setLiveClock] = useState('');
  const [capturedLiveTimestamp, setCapturedLiveTimestamp] = useState<string>('');

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Handover state
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Odometer & Photo inspection state
  const [odometerFile, setOdometerFile] = useState<File | null>(null);
  const [odometerPreview, setOdometerPreview] = useState<string>('');
  const [odometerReading, setOdometerReading] = useState<string>('');
  const [ocrDetected, setOcrDetected] = useState<string>('');
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'scanning' | 'success' | 'no_digits' | 'error'>('idle');

  // Optional exterior photos
  const [showExteriorSection, setShowExteriorSection] = useState(false);
  const [exteriorPhotos, setExteriorPhotos] = useState<Record<string, { file?: File; preview?: string; url?: string }>>({
    front: {},
    rear: {},
    left: {},
    right: {},
    damage: {},
  });
  const [damageNotes, setDamageNotes] = useState('');

  // Vehicle release OTP state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return iso;
    }
  };

  const hostName = booking.host_name || 'Ravi';
  const hostPhone = booking.host_phone || '+91 98765 43210';
  const listingTitle = booking.listing?.title || `${hostName}'s Parking Space`;
  const address = booking.listing?.exact_address || booking.listing?.approximate_address || 'Indiranagar, Bengaluru';
  const lat = booking.listing?.latitude || 12.9784;
  const lng = booking.listing?.longitude || 77.6408;

  const handleNavigate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const url = `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${lat},${lng}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        },
        () => {
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank', 'noopener,noreferrer');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank', 'noopener,noreferrer');
    }
  };

  // 1. Driver arrives
  const handleMarkArrival = async () => {
    setLoadingAction(true);
    setActionError('');
    try {
      await api.markDriverArrived(booking.id);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record arrival');
    } finally {
      setLoadingAction(false);
    }
  };

  // Live Camera Controls & Stream Lifecycle
  React.useEffect(() => {
    if (!showLiveCamera) return;
    const updateClock = () => {
      const d = new Date();
      setLiveClock(`${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour12: true })}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [showLiveCamera]);

  React.useEffect(() => {
    if (showLiveCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [showLiveCamera, cameraStream]);

  React.useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const startLiveCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setShowLiveCamera(true);
    setCameraLoading(true);
    setCameraPermissionError('');

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera hardware access is not supported by this browser. Please use the mobile camera upload button.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Live camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermissionError('Camera permission was denied. Please allow camera access in browser settings or use the upload button.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraPermissionError('No camera found on this device. Please use camera upload.');
      } else {
        setCameraPermissionError(err.message || 'Unable to open live camera.');
      }
    } finally {
      setCameraLoading(false);
    }
  };

  const stopLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowLiveCamera(false);
    setCameraPermissionError('');
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startLiveCamera(nextFacing);
  };

  const captureLiveSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw live video frame
    ctx.drawImage(video, 0, 0, width, height);

    // Live verified watermark
    const now = new Date();
    const timeStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour12: true })} • LIVE VERIFIED`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, height - 42, width, 42);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#34d399'; // Emerald-400
    ctx.fillText(`PARKSHARE LIVE ODOMETER | ${timeStr}`, 20, height - 16);

    // Convert canvas image to Blob & File
    canvas.toBlob(async (blob) => {
      if (blob) {
        const liveFile = new File([blob], `live_odometer_${booking.id}_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        setOdometerFile(liveFile);
        const url = URL.createObjectURL(blob);
        setOdometerPreview(url);
        setCapturedLiveTimestamp(timeStr);
        setOcrStatus('scanning');
        setOcrDetected('');

        try {
          // Genuine client-side OCR reading actual characters from the live photo
          const ocrPromise = Tesseract.recognize(blob, 'eng');
          const timeoutPromise = new Promise<{ data: { text: string } }>((_, reject) =>
            setTimeout(() => reject(new Error('OCR Timeout')), 8000)
          );

          const result = await Promise.race([ocrPromise, timeoutPromise]);
          const rawText = result?.data?.text || '';

          // Look for digit sequences (3 to 7 digits, e.g. 38940, 42381, 105200)
          // Also check for comma formatted numbers like 38,940 or 42,381
          const commaMatches = rawText.match(/\b\d{1,3}(?:,\d{3})+\b/g);
          const plainDigitMatches = rawText.match(/\b\d{3,7}\b/g);

          let detectedNum = '';
          if (commaMatches && commaMatches.length > 0) {
            detectedNum = commaMatches[0].replace(/,/g, '');
          } else if (plainDigitMatches && plainDigitMatches.length > 0) {
            // Exclude current years if other numbers are present
            const nonYear = plainDigitMatches.filter((n) => !['2024', '2025', '2026'].includes(n));
            detectedNum = nonYear.length > 0 ? nonYear[0] : plainDigitMatches[0];
          }

          if (detectedNum && parseInt(detectedNum, 10) > 0) {
            const formatted = parseInt(detectedNum, 10).toLocaleString() + ' KM';
            setOcrDetected(formatted);
            setOcrStatus('success');
            setOdometerReading(detectedNum);
          } else {
            // Photo did not contain any visible odometer numbers (e.g. driver face selfie, blank image)
            setOcrDetected('No digits detected in photo');
            setOcrStatus('no_digits');
          }
        } catch (err) {
          console.warn('OCR error or timeout:', err);
          setOcrDetected('No digits detected');
          setOcrStatus('error');
        }
      }
    }, 'image/jpeg', 0.92);

    stopLiveCamera();
  };

  // Exterior photo selection
  const handleExteriorPhotoChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setExteriorPhotos((prev) => ({
        ...prev,
        [key]: { file, preview: url },
      }));
    }
  };

  // 2. Submit Odometer & Inspection
  const handleSubmitInspection = async () => {
    if (!odometerFile && !odometerPreview) {
      setActionError('Live Odometer photo is strictly required. Please tap "Take Live Odometer Photo" to capture the vehicle dashboard live.');
      return;
    }
    const readingNum = parseFloat(odometerReading.replace(/,/g, ''));
    if (isNaN(readingNum) || readingNum <= 0) {
      setActionError('Please provide a valid odometer KM reading.');
      return;
    }

    setLoadingAction(true);
    setActionError('');
    try {
      let photoUrl = '/uploads/odometer_default.jpg';
      if (odometerFile) {
        const uploadRes = await api.uploadFile(odometerFile, `odometer_${booking.id}.jpg`);
        photoUrl = uploadRes.url;
      }

      // Upload any exterior photos provided
      const uploadedExterior: Record<string, string> = {};
      for (const [side, item] of Object.entries(exteriorPhotos)) {
        if (item.file) {
          try {
            const extRes = await api.uploadFile(item.file, `${side}_${booking.id}.jpg`);
            uploadedExterior[side] = extRes.url;
          } catch {}
        }
      }

      await api.submitOdometer(booking.id, {
        odometer_photo_url: photoUrl,
        odometer_reading: readingNum,
        odometer_ocr_text: ocrDetected || `${readingNum.toLocaleString()} KM`,
        exterior_photos: Object.keys(uploadedExterior).length > 0 ? uploadedExterior : undefined,
        damage_notes: damageNotes.trim() || undefined,
      });

      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit inspection');
    } finally {
      setLoadingAction(false);
    }
  };

  // 3. Request vehicle collection
  const handleRequestCollection = async () => {
    setLoadingAction(true);
    setActionError('');
    try {
      await api.requestVehicleCollection(booking.id);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to request collection');
    } finally {
      setLoadingAction(false);
    }
  };

  // 4. Verify Host Release OTP
  const handleOtpDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);

    // Auto focus next input
    if (clean && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setActionError('Please enter the full 6-digit OTP provided by the host.');
      return;
    }

    setLoadingAction(true);
    setActionError('');
    try {
      await api.verifyReleaseOtp(booking.id, fullOtp);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Verification failed. Incorrect OTP.');
    } finally {
      setLoadingAction(false);
    }
  };

  // End Parking -> Triggers Owner OTP Requirement
  const handleEndParking = async () => {
    setEnding(true);
    setActionError('');
    try {
      await api.endParking(booking.id);
      setShowEndModal(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to initiate end parking');
    } finally {
      setEnding(false);
    }
  };

  const status = booking.status;
  const isPendingArrival = status === 'CONFIRMED' || status === 'BOOKING_CREATED';
  const isInspectionStage = status === 'DRIVER_ARRIVED';
  const isKeyPending = status === 'ODOMETER_PHOTO_SUBMITTED' || status === 'KEY_HANDOVER_PENDING';
  const isParkingActive = status === 'KEY_RECEIVED' || status === 'PARKING_ACTIVE' || status === 'ACTIVE';
  const isCollectionRequested = status === 'VEHICLE_COLLECTION_REQUESTED';
  const isCompleted = status === 'COMPLETED' || status === 'RELEASE_OTP_VERIFIED' || status === 'VEHICLE_RELEASED';

  return (
    <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-emerald-600/40 relative overflow-hidden my-4 space-y-6">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header with Lifecycle Progress Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/40 pb-4">
        <div className="flex items-center space-x-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
          <div>
            <span className="text-xs font-mono font-bold text-emerald-400 block tracking-wider uppercase">
              RESERVATION #{booking.booking_reference}
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">{listingTitle}</h2>
          </div>
        </div>

        {/* Dynamic Status Pill */}
        <div className="flex items-center space-x-2">
          {isPendingArrival && (
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              En Route to Location
            </span>
          )}
          {isInspectionStage && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
              Driver Arrived • Inspection Due
            </span>
          )}
          {isKeyPending && (
            <span className="bg-purple-500/20 text-purple-300 border border-purple-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
              Key Handover Pending
            </span>
          )}
          {isParkingActive && (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              Parking Active ✅ Key Received
            </span>
          )}
          {isCollectionRequested && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
              Vehicle Collection In Progress
            </span>
          )}
          {isCompleted && (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              Trip Completed ✅
            </span>
          )}
        </div>
      </div>

      {/* Visual State Machine Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold">
        <div
          className={`p-2.5 rounded-xl border flex items-center space-x-1.5 ${
            isPendingArrival || isInspectionStage || isKeyPending || isParkingActive || isCollectionRequested || isCompleted
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-500'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] flex items-center justify-center font-black">
            1
          </span>
          <span>1. Arrive & Mileage</span>
        </div>

        <div
          className={`p-2.5 rounded-xl border flex items-center space-x-1.5 ${
            isKeyPending || isParkingActive || isCollectionRequested || isCompleted
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-500'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] flex items-center justify-center font-black">
            2
          </span>
          <span>2. Key Handover</span>
        </div>

        <div
          className={`p-2.5 rounded-xl border flex items-center space-x-1.5 ${
            isParkingActive || isCollectionRequested || isCompleted
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-500'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] flex items-center justify-center font-black">
            3
          </span>
          <span>3. Parking Active</span>
        </div>

        <div
          className={`p-2.5 rounded-xl border flex items-center space-x-1.5 ${
            isCollectionRequested || isCompleted
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-500'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] flex items-center justify-center font-black">
            4
          </span>
          <span>4. OTP Vehicle Release</span>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-500/20 text-rose-200 border border-rose-500/40 p-3.5 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 1: CONFIRMED / EN ROUTE -> DRIVER ARRIVES                      */}
      {/* ===================================================================== */}
      {isPendingArrival && (
        <div className="bg-emerald-900/40 border border-emerald-600/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Navigating to Parking Space</span>
              </h3>
              <p className="text-xs text-emerald-200/90">{address}</p>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-lg font-bold">
              Slot {booking.space_number || 'A01'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-800/60">
              <span className="text-[10px] text-emerald-300/70 uppercase block font-semibold">Start Time</span>
              <span className="text-sm font-extrabold text-white">{formatTime(booking.start_time)}</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-800/60">
              <span className="text-[10px] text-emerald-300/70 uppercase block font-semibold">Scheduled End</span>
              <span className="text-sm font-extrabold text-white">{formatTime(booking.end_time)}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleNavigate}
              className="flex-1 bg-emerald-800/70 hover:bg-emerald-800 text-emerald-100 font-bold py-3 px-4 rounded-xl text-xs transition border border-emerald-700 flex items-center justify-center space-x-2"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Get Directions</span>
            </button>

            <button
              onClick={handleMarkArrival}
              disabled={loadingAction}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 px-4 rounded-xl text-xs transition shadow-lg flex items-center justify-center space-x-2"
            >
              <Car className="w-4 h-4" />
              <span>{loadingAction ? 'Recording Arrival...' : '📍 I Have Arrived at Location'}</span>
            </button>

            <button
              onClick={() => setShowEndModal(true)}
              className="bg-rose-900/60 hover:bg-rose-900 text-rose-200 font-bold py-3 px-3 rounded-xl text-xs transition border border-rose-700/60 flex items-center justify-center space-x-1.5"
              title="End parking session (Owner OTP required)"
            >
              <Square className="w-3.5 h-3.5 fill-rose-300" />
              <span>End Parking</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 2: DRIVER ARRIVED -> ODOMETER & EXTERIOR INSPECTION CAPTURE     */}
      {/* ===================================================================== */}
      {isInspectionStage && (
        <div className="bg-slate-900/90 border-2 border-emerald-500 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                MANDATORY CHECK-IN INSPECTION
              </span>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span>Capture Vehicle KM & Odometer Reading</span>
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Vehicle: {booking.vehicle?.registration_number || 'KA 01 AB 1234'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Take a clear photo of the dashboard odometer to create a timestamped record of the vehicle's mileage
            prior to key handover.
          </p>

          {/* Odometer Photo Capture: LIVE CAMERA FIRST */}
          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Left Action Box: Live Camera Trigger */}
              <div className="w-full sm:w-1/2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => startLiveCamera()}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black p-4 rounded-2xl flex flex-col items-center justify-center text-center transition shadow-lg hover:scale-[1.01] group border-2 border-emerald-400 cursor-pointer"
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                    <Camera className="w-6 h-6 text-slate-950 group-hover:scale-110 transition" />
                  </div>
                  <span className="text-sm font-extrabold text-slate-950">📸 Take Live Odometer Photo</span>
                  <span className="text-[11px] text-emerald-950/80 mt-0.5 font-bold">
                    Opens real-time camera viewfinder
                  </span>
                </button>

                {/* Anti-Cheat Live Enforcement Notice */}
                <div className="flex items-center justify-center space-x-2 text-[11px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 rounded-xl px-3 py-2 font-bold text-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Anti-Cheat Active: Live camera capture only. File uploads strictly prohibited.</span>
                </div>
              </div>

              {/* Right: Live Preview & Smart OCR Badge */}
              <div className="w-full sm:w-1/2 space-y-2">
                {odometerPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-black h-40 flex items-center justify-center shadow-md">
                    <img src={odometerPreview} alt="Live Odometer" className="h-full w-full object-cover" />
                    
                    {/* Live Watermark Tag */}
                    <div className="absolute top-2 left-2 bg-slate-950/90 text-emerald-400 border border-emerald-500/60 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center space-x-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>LIVE CAPTURED</span>
                    </div>

                    {ocrStatus === 'scanning' && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 text-xs text-emerald-300 font-bold p-3 text-center">
                        <Sparkles className="w-6 h-6 animate-spin text-emerald-400" />
                        <span>OCR Scanning Live Dashboard Digits...</span>
                        <span className="text-[10px] text-slate-400 font-normal">Analyzing image for mileage numbers</span>
                      </div>
                    )}
                    {ocrStatus === 'success' && ocrDetected && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/85 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-emerald-400 text-xs font-black text-emerald-300 flex items-center justify-between shadow-lg">
                        <span className="truncate">OCR Read: {ocrDetected}</span>
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-1" />
                      </div>
                    )}
                    {(ocrStatus === 'no_digits' || ocrStatus === 'error') && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/90 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-amber-500/80 text-[10px] font-bold text-amber-300 flex items-center justify-between shadow-lg">
                        <span className="truncate">⚠️ No digits detected (Enter KM below or retake)</span>
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 ml-1" />
                      </div>
                    )}

                    {/* Retake Live Photo Button */}
                    <button
                      type="button"
                      onClick={() => startLiveCamera()}
                      className="absolute top-2 right-2 bg-black/80 hover:bg-slate-900 text-white font-bold px-2 py-1 rounded-xl text-[10px] border border-slate-600 flex items-center space-x-1 shadow-sm transition"
                      title="Retake live photo"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Retake Live</span>
                    </button>
                  </div>
                ) : (
                  <div className="h-40 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/60 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
                    <Camera className="w-8 h-8 mb-2 text-slate-500" />
                    <span className="font-bold text-slate-300">Live Photo Required</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Must be taken live at the vehicle dashboard before handover
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Editable KM Reading Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Vehicle KM Reading (Odometer)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={odometerReading}
                    onChange={(e) => setOdometerReading(e.target.value)}
                    placeholder="e.g. 42381"
                    className="w-full bg-slate-900 border border-emerald-600/70 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-400 font-mono">KM</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Timestamp Recorded
                </label>
                <div className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-300 font-mono text-xs flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>{new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Exterior Vehicle Photos Accordion */}
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExteriorSection(!showExteriorSection)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800 transition"
            >
              <div className="flex items-center space-x-2.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">📷 Add Vehicle Exterior Photos (Optional)</span>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                  Dispute Protection
                </span>
              </div>
              {showExteriorSection ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showExteriorSection && (
              <div className="p-4 pt-0 space-y-4 border-t border-slate-700/60">
                <p className="text-[11px] text-slate-400 mt-2">
                  Take photos of Front, Rear, Left, Right, or any existing scratches to safeguard against false claims.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['front', 'rear', 'left', 'right'] as const).map((side) => (
                    <label
                      key={side}
                      className="cursor-pointer border border-dashed border-slate-600 hover:border-emerald-500 bg-slate-900/60 p-3 rounded-xl flex flex-col items-center justify-center text-center transition group h-24 relative overflow-hidden"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleExteriorPhotoChange(side, e)}
                        className="hidden"
                      />
                      {exteriorPhotos[side]?.preview ? (
                        <img
                          src={exteriorPhotos[side].preview}
                          alt={side}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 mb-1" />
                          <span className="text-[10px] font-bold text-slate-300 capitalize">{side}</span>
                        </>
                      )}
                    </label>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Existing Damage or Pre-existing Scratch Notes
                  </label>
                  <textarea
                    rows={2}
                    value={damageNotes}
                    onChange={(e) => setDamageNotes(e.target.value)}
                    placeholder="e.g. Minor hairline scratch on rear left door..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Inspection Button */}
          <button
            onClick={handleSubmitInspection}
            disabled={loadingAction}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl text-xs transition shadow-xl flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {loadingAction ? 'Uploading Inspection...' : '✅ Submit Inspection & Hand Over Key to Host'}
            </span>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 3: KEY HANDOVER PENDING -> WAITING FOR HOST CONFIRMATION        */}
      {/* ===================================================================== */}
      {isKeyPending && (
        <div className="bg-purple-950/40 border border-purple-500/50 rounded-3xl p-6 space-y-5 text-center">
          <div className="w-14 h-14 bg-purple-500/20 text-purple-300 rounded-2xl flex items-center justify-center mx-auto border border-purple-400/40">
            <KeyRound className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-black text-white">Inspection Submitted! Hand Over Key</h3>
            <p className="text-xs text-purple-200/90 leading-relaxed">
              Please hand over your vehicle key to host <strong>{hostName}</strong> ({hostPhone}).
              Waiting for the host to press <strong>"Confirm Key Received"</strong> on their device.
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-purple-900/60 inline-flex flex-col sm:flex-row items-center gap-4 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Recorded KM:</span>
              <span className="font-extrabold text-emerald-400 text-sm">
                {booking.odometer_reading ? `${booking.odometer_reading.toLocaleString()} KM` : '42,381 KM'}
              </span>
            </div>
            {booking.odometer_photo_url && (
              <a
                href={booking.odometer_photo_url}
                target="_blank"
                rel="noreferrer"
                className="text-purple-300 underline font-sans text-xs"
              >
                View Stored KM Photo ↗
              </a>
            )}
          </div>

          <div className="pt-2 flex justify-center space-x-3">
            <button
              onClick={() => onRefresh()}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition flex items-center space-x-2 shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Check for Host Confirmation</span>
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition border border-slate-700 flex items-center space-x-1.5"
            >
              <Phone className="w-4 h-4 text-purple-400" />
              <span>Call Host</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 4: PARKING ACTIVE (KEY RECEIVED BY HOST)                         */}
      {/* ===================================================================== */}
      {isParkingActive && (
        <div className="space-y-5">
          {/* Active Parking Status Card */}
          <div className="bg-emerald-900/50 p-5 rounded-2xl border border-emerald-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-black text-emerald-300">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>KEY RECEIVED BY HOST • VEHICLE SAFELY PARKED</span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Slot {booking.space_number || 'A01'} • Host {hostName} has custody of your key.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-emerald-300/80 uppercase font-bold block">Scheduled End</span>
              <span className="text-lg font-black text-white">{formatTime(booking.end_time)}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={handleNavigate}
              className="bg-emerald-800/60 hover:bg-emerald-800 text-emerald-100 font-bold py-3 px-3 rounded-2xl text-xs transition border border-emerald-700 flex items-center justify-center space-x-1.5"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Directions</span>
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="bg-emerald-800/60 hover:bg-emerald-800 text-emerald-100 font-bold py-3 px-3 rounded-2xl text-xs transition border border-emerald-700 flex items-center justify-center space-x-1.5"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Pass QR</span>
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="bg-emerald-800/60 hover:bg-emerald-800 text-emerald-100 font-bold py-3 px-3 rounded-2xl text-xs transition border border-emerald-700 flex items-center justify-center space-x-1.5"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Call Host</span>
            </button>

            {/* End Parking Trigger */}
            <button
              onClick={handleEndParking}
              disabled={loadingAction}
              className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black py-3 px-3 rounded-2xl text-xs transition shadow-lg flex items-center justify-center space-x-1.5 hover:scale-[1.02]"
              title="Requests Space Owner OTP to conclude parking"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>🛑 End Parking</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 5: VEHICLE COLLECTION REQUESTED -> ENTER OWNER RELEASE OTP      */}
      {/* ===================================================================== */}
      {isCollectionRequested && (
        <div className="bg-slate-900/95 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
          <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-400/40">
            <KeyRound className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
              FINAL VEHICLE RELEASE & TRIP CONCLUSION
            </span>
            <h3 className="text-xl font-black text-white">Enter Space Owner Release OTP</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You gave <strong>End Parking</strong>. Space owner <strong>{hostName}</strong> ({hostPhone}) must provide you a 6-digit release OTP.
              <strong className="block text-amber-300 mt-1">The trip will only conclude after this OTP is verified.</strong>
            </p>
          </div>

          {/* 6 Digit Input Boxes */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-amber-300 block">Enter 6-Digit Owner OTP</span>
            <div className="flex justify-center space-x-2 sm:space-x-3">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-11 h-14 sm:w-13 sm:h-16 text-center text-2xl font-black font-mono text-emerald-400 bg-slate-800 border-2 border-slate-600 focus:border-emerald-400 focus:bg-slate-900 rounded-2xl focus:outline-none transition shadow-inner"
                />
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Security: One-time use • 10-minute expiry • Stored securely hashed
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3 max-w-sm mx-auto">
            <button
              onClick={handleVerifyOtp}
              disabled={loadingAction}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 px-6 rounded-2xl text-xs transition shadow-xl flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loadingAction ? 'Verifying OTP...' : '✅ Verify Owner OTP & End Trip'}</span>
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 px-4 rounded-2xl text-xs transition border border-slate-700 flex items-center justify-center space-x-1.5"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Call Owner</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 6: COMPLETED SCREEN                                             */}
      {/* ===================================================================== */}
      {isCompleted && (
        <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-3xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white">Trip Completed • Vehicle Released ✅</h3>
          <p className="text-xs text-emerald-200/90 max-w-md mx-auto">
            Key handover completed successfully. Your vehicle was checked out and the one-time OTP was consumed.
          </p>
        </div>
      )}

      {/* Modal 1: Booking QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl relative border border-gray-100">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-gray-900">Booking Verification Pass</h3>
            <p className="text-xs text-gray-500">Scan QR at parking gate or provide 4-digit backup PIN code to host.</p>

            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 flex flex-col items-center space-y-3">
              <div className="w-44 h-44 bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center justify-center">
                <div className="w-full h-full border-4 border-dashed border-emerald-600 rounded-lg flex items-center justify-center bg-emerald-50/50 text-center">
                  <span className="font-mono text-xs font-extrabold text-emerald-950 break-all px-2">
                    {booking.qr_token || booking.booking_reference}
                  </span>
                </div>
              </div>

              <div className="bg-white px-4 py-2 rounded-xl border border-emerald-300 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Backup Entry PIN</span>
                <span className="text-2xl font-black text-emerald-800 font-mono tracking-widest">
                  {booking.verification_code || '4829'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Host Contact */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative border border-gray-100">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-800 font-extrabold text-lg">
                {hostName.charAt(0)}
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">{hostName}</h3>
              <p className="text-xs text-gray-500">Verified Space Host</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Phone:</span>
                <a href={`tel:${hostPhone}`} className="font-extrabold text-emerald-700 hover:underline">
                  {hostPhone}
                </a>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Space Slot:</span>
                <span className="font-bold text-gray-800">{booking.space_number || 'Slot A01'}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <a
                href={`tel:${hostPhone}`}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition text-center shadow-xs"
              >
                <Phone className="w-4 h-4" />
                <span>Call Directly</span>
              </a>
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: End Parking Confirmation */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative border border-gray-100 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
              <Square className="w-6 h-6 fill-rose-600" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900">End Parking Session?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              When you give End Parking, the space owner will issue a 6-digit Release OTP.
              <strong className="block text-rose-700 mt-1">The trip will only conclude after you enter the owner's OTP.</strong>
            </p>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition"
              >
                Go Back
              </button>
              <button
                onClick={handleEndParking}
                disabled={ending}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm"
              >
                {ending ? 'Requesting...' : 'Request Owner OTP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Live Camera Viewfinder Modal */}
      {showLiveCamera && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-fadeIn">
          {/* Top Bar */}
          <div className="w-full max-w-xl flex items-center justify-between text-white z-10 py-2">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-xs font-black uppercase tracking-wider text-red-400">
                LIVE CAMERA FEED
              </span>
              <span className="text-[11px] font-mono text-slate-300 hidden sm:inline">
                • {liveClock}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="bg-slate-800/80 hover:bg-slate-700 text-white p-2.5 rounded-2xl border border-slate-600 transition flex items-center space-x-1.5 text-xs font-bold"
                title="Switch Camera (Front/Back)"
              >
                <SwitchCamera className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Flip</span>
              </button>

              <button
                type="button"
                onClick={stopLiveCamera}
                className="bg-slate-800/80 hover:bg-rose-900 text-white p-2.5 rounded-2xl border border-slate-600 transition"
                title="Close camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Viewfinder Frame with Aiming HUD */}
          <div className="relative w-full max-w-xl aspect-4/3 sm:aspect-16/9 bg-slate-950 rounded-3xl overflow-hidden border-2 border-emerald-500/80 shadow-2xl flex items-center justify-center my-auto">
            {cameraPermissionError ? (
              <div className="p-6 text-center space-y-3 max-w-sm">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Camera Access Error</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{cameraPermissionError}</p>
                <button
                  type="button"
                  onClick={() => startLiveCamera()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition"
                >
                  Retry Camera Access
                </button>
              </div>
            ) : cameraLoading ? (
              <div className="flex flex-col items-center space-y-2 text-emerald-400 text-xs font-bold">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span>Initializing Live Camera...</span>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Aiming Reticle / HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {/* Target Box for Odometer */}
                  <div className="relative w-4/5 sm:w-3/5 h-28 sm:h-32 border-2 border-dashed border-emerald-400/90 rounded-2xl flex items-center justify-center bg-emerald-500/5 shadow-[0_0_20px_rgba(52,211,153,0.15)]">
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-md"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-md"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-md"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-md"></div>

                    <div className="text-center space-y-1">
                      <Crosshair className="w-6 h-6 text-emerald-400 mx-auto animate-pulse" />
                      <span className="text-[11px] font-mono font-black text-emerald-300 tracking-wide block bg-black/60 px-2 py-0.5 rounded-md">
                        ALIGN ODOMETER / KM CLUSTER
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-white/90 bg-black/70 px-3 py-1 rounded-full mt-3 font-semibold shadow-sm">
                    Hold device steady • Digits will be read automatically
                  </p>
                </div>

                {/* Bottom live timestamp overlay */}
                <div className="absolute bottom-3 left-3 bg-black/70 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-emerald-400 flex items-center space-x-1.5 border border-emerald-500/40">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{liveClock}</span>
                </div>
              </>
            )}
          </div>

          {/* Hidden Canvas for High-Res Live Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Bottom Shutter Controls */}
          <div className="w-full max-w-xl flex items-center justify-center py-4 z-10">
            <button
              type="button"
              onClick={captureLiveSnapshot}
              disabled={cameraLoading || !!cameraPermissionError}
              className="group relative flex items-center justify-center disabled:opacity-40 cursor-pointer"
              title="Capture Live Photo"
            >
              {/* Glowing Outer Ring */}
              <div className="w-20 h-20 rounded-full border-4 border-white/90 flex items-center justify-center group-hover:scale-105 transition shadow-2xl bg-white/20">
                {/* Inner Shutter Button */}
                <div className="w-16 h-16 rounded-full bg-emerald-500 group-hover:bg-emerald-400 transition flex items-center justify-center shadow-inner">
                  <Camera className="w-8 h-8 text-slate-950" />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
