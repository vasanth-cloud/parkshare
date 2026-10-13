import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Booking } from '../types';
import { 
  KeyRound, 
  QrCode, 
  CheckCircle, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  Car, 
  Lock, 
  RotateCcw, 
  Clock, 
  Sparkles, 
  Check, 
  X,
  Phone,
  Calendar,
  ExternalLink
} from 'lucide-react';

export const HostPinVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  // Tabs: 'handover' is the primary default tab matching the user screenshot!
  const [activeTab, setActiveTab] = useState<'handover' | 'qr' | 'pin'>('handover');

  // PIN input state: 4 separate digits
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const pinInputRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];

  const [qrToken, setQrToken] = useState('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Photo modal state
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Handover state
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [generatedOtps, setGeneratedOtps] = useState<Record<number, { otp: string; expires_at: string }>>({});
  const [handoverLoading, setHandoverLoading] = useState<number | null>(null);

  const fetchHandoverBookings = async () => {
    try {
      setIsRefreshing(true);
      const data = await api.getHostBookings();
      setHostBookings(data || []);
    } catch {} finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHandoverBookings();
    const interval = setInterval(fetchHandoverBookings, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle PIN digit entry & auto-advance
  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) {
      const updated = [...pinDigits];
      updated[index] = '';
      setPinDigits(updated);
      return;
    }

    if (cleanVal.length > 1) {
      const chars = cleanVal.slice(0, 4).split('');
      const updated = ['', '', '', ''];
      chars.forEach((c, i) => {
        updated[i] = c;
      });
      setPinDigits(updated);
      const nextIndex = Math.min(chars.length, 3);
      pinInputRefs[nextIndex]?.current?.focus();
      return;
    }

    const updated = [...pinDigits];
    updated[index] = cleanVal;
    setPinDigits(updated);

    if (index < 3) {
      pinInputRefs[index + 1]?.current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1]?.current?.focus();
    }
  };

  const fullPin = pinDigits.join('');

  const handleCheckInWithPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (fullPin.length < 4) {
      setError('Please enter all 4 digits of the driver PIN.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setSessionData(null);
    setLoading(true);

    try {
      const res = await api.checkInSession({
        verification_code: fullPin,
      });

      const sData = res.session || res;
      setSessionData(sData);
      if (sData.is_already_active || sData.message?.toLowerCase().includes('already')) {
        setSuccessMsg(`✓ Driver PIN verified! This vehicle is already checked in & currently parked.`);
      } else {
        setSuccessMsg(`✓ Check-in Verified! Booking is now active.`);
      }
      setPinDigits(['', '', '', '']);
      fetchHandoverBookings();
    } catch (err: any) {
      const rawMsg = err.message || '';
      if (rawMsg.includes('PARKING_ACTIVE') || rawMsg.includes('already active') || rawMsg.includes('already parking active')) {
        setSuccessMsg(`✓ This vehicle is already checked in and actively parked!`);
        setError('');
        fetchHandoverBookings();
      } else {
        const cleaned = rawMsg.replace(/BookingStatusEnum\./g, '').replace(/_/g, ' ');
        setError(cleaned || 'Invalid or expired PIN. Please check the 4-digit code with driver.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInWithQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrToken.trim()) return;

    setError('');
    setSuccessMsg('');
    setSessionData(null);
    setLoading(true);

    try {
      const res = await api.checkInSession({
        qr_token: qrToken.trim(),
      });

      const sData = res.session || res;
      setSessionData(sData);
      if (sData.is_already_active || sData.message?.toLowerCase().includes('already')) {
        setSuccessMsg(`✓ Driver QR Pass Validated! This vehicle is already checked in & currently parked.`);
      } else {
        setSuccessMsg(`✓ Driver QR Pass Validated!`);
      }
      setQrToken('');
      fetchHandoverBookings();
    } catch (err: any) {
      const rawMsg = err.message || '';
      if (rawMsg.includes('PARKING_ACTIVE') || rawMsg.includes('already active') || rawMsg.includes('already parking active')) {
        setSuccessMsg(`✓ This vehicle is already checked in and actively parked!`);
        setError('');
        fetchHandoverBookings();
      } else {
        const cleaned = rawMsg.replace(/BookingStatusEnum\./g, '').replace(/_/g, ' ');
        setError(cleaned || 'Invalid or expired QR Token.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmKeyReceived = async (bookingId: number) => {
    try {
      setHandoverLoading(bookingId);
      setError('');
      await api.confirmKeyReceived(bookingId);
      setSuccessMsg(`✓ Key receipt confirmed for Booking #${bookingId}!`);
      await fetchHandoverBookings();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm key handover');
    } finally {
      setHandoverLoading(null);
    }
  };

  const handleGenerateReleaseOtp = async (bookingId: number) => {
    try {
      setHandoverLoading(bookingId);
      setError('');
      const res = await api.generateReleaseOtp(bookingId);
      setGeneratedOtps((prev) => ({
        ...prev,
        [bookingId]: { otp: res.release_otp, expires_at: res.expires_at },
      }));
      setSuccessMsg(`✓ Vehicle Release OTP generated: ${res.release_otp}`);
      await fetchHandoverBookings();
    } catch (err: any) {
      setError(err.message || 'Failed to generate release OTP');
    } finally {
      setHandoverLoading(null);
    }
  };

  const activeHandovers = hostBookings.filter((b) =>
    [
      'CONFIRMED',
      'DRIVER_ARRIVED',
      'ODOMETER_PHOTO_SUBMITTED',
      'KEY_HANDOVER_PENDING',
      'KEY_RECEIVED',
      'PARKING_ACTIVE',
      'ACTIVE',
      'VEHICLE_COLLECTION_REQUESTED',
    ].includes(b.status)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3faf7] via-white to-[#f4faf7] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-gray-900 dark:text-slate-100 py-6 px-3.5 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-5 pb-28 transition-colors duration-200">
      
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 py-1.5 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back</span>
        </button>
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
          🔑 Driver Gate Check-in
        </span>
      </div>

      {/* 1. TOP HERO BANNER: Gate Access & Vehicle Handover (Matching screenshot) */}
      <div className="text-center space-y-3 pt-1">
        {/* Boom Barrier Gate + Car Illustration */}
        <div className="flex justify-center items-center">
          <div className="relative w-48 h-28 sm:w-56 sm:h-32 flex items-center justify-center">
            <svg viewBox="0 0 200 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Soft mint backdrop halo */}
              <ellipse cx="100" cy="74" rx="72" ry="34" fill="#eaf8f1" className="dark:opacity-20" />
              
              {/* Green Sparkle & Speed Ticks */}
              <path d="M 68 38 L 60 32" stroke="#0f8b5f" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 80 26 L 78 18" stroke="#0f8b5f" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 120 26 L 122 18" stroke="#0f8b5f" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 132 38 L 140 32" stroke="#0f8b5f" strokeWidth="2.5" strokeLinecap="round" />
              
              {/* Green Shield Checkmark */}
              <g transform="translate(86, 11)">
                <path d="M 14 0 C 22 2 28 6 28 14 C 28 22 20 28 14 31 C 8 28 0 22 0 14 C 0 6 6 2 14 0 Z" fill="#0f8b5f" />
                <path d="M 8 15 L 12 19 L 20 11" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Boom Barrier Gate Arm */}
              <path d="M 62 48 L 146 56" stroke="#0f8b5f" strokeWidth="5.5" strokeLinecap="round" />
              {/* White barrier stripes */}
              <path d="M 76 49.3 L 82 49.9" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 94 51 L 100 51.6" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 112 52.8 L 118 53.4" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 130 54.6 L 136 55.2" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />

              {/* Gate Post on Right */}
              <rect x="144" y="52" width="18" height="42" rx="4" fill="#0c6b4e" />
              <circle cx="153" cy="62" r="3.5" fill="#eaf8f1" />
              <rect x="141" y="90" width="24" height="6" rx="2" fill="#084733" />

              {/* Front View Green Car */}
              <g transform="translate(62, 54)">
                {/* Wheels */}
                <rect x="2" y="24" width="8" height="18" rx="3" fill="#1e293b" />
                <rect x="66" y="24" width="8" height="18" rx="3" fill="#1e293b" />
                {/* Cabin */}
                <path d="M 16 14 Q 22 2 38 2 Q 54 2 60 14 Z" fill="#0c6b4e" />
                <path d="M 19 13 Q 24 5 38 5 Q 52 5 57 13 Z" fill="#d1fae5" />
                {/* Body */}
                <rect x="8" y="14" width="60" height="24" rx="8" fill="#10b981" />
                {/* Headlights */}
                <rect x="12" y="19" width="10" height="6" rx="3" fill="#ffffff" />
                <rect x="54" y="19" width="10" height="6" rx="3" fill="#ffffff" />
                {/* Grille */}
                <rect x="28" y="22" width="20" height="7" rx="3" fill="#065f46" />
                {/* Bumper */}
                <rect x="10" y="32" width="56" height="5" rx="2.5" fill="#047857" />
              </g>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Host Gate Access & Vehicle Handover
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Manage key handovers, verify vehicle inspections, and issue secure one-time vehicle release OTPs to conclude parking trips.
        </p>
      </div>

      {/* Global Banners */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-3.5 rounded-2xl text-xs font-semibold border border-red-200 dark:border-red-900/50 flex items-center space-x-2 animate-in fade-in shadow-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 p-3.5 rounded-2xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center space-x-2 animate-in fade-in shadow-xs">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. SEGMENTED TABS CONTAINER (Clean rounded pill selector matching screenshot) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-sm border border-emerald-100 dark:border-slate-800 flex items-center justify-between gap-1.5 transition-colors duration-200">
        {/* Tab 1: Vehicle Handover */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('handover');
            setError('');
            setSuccessMsg('');
          }}
          className={`flex-1 py-3 px-2 sm:px-3 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer text-xs font-bold ${
            activeTab === 'handover'
              ? 'bg-[#0f8b5f] text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className={`w-4 h-4 ${activeTab === 'handover' ? 'text-white' : 'text-emerald-700 dark:text-emerald-400'}`} />
          <span className="truncate">Vehicle Handover ({activeHandovers.length})</span>
        </button>

        {/* Tab 2: QR Pass */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('qr');
            setError('');
            setSuccessMsg('');
          }}
          className={`flex-1 py-3 px-2 sm:px-3 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer text-xs font-bold ${
            activeTab === 'qr'
              ? 'bg-[#0f8b5f] text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          <QrCode className={`w-4 h-4 ${activeTab === 'qr' ? 'text-white' : 'text-gray-500 dark:text-slate-400'}`} />
          <span className="truncate">QR Pass</span>
        </button>

        {/* Tab 3: Backup PIN */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('pin');
            setError('');
            setSuccessMsg('');
          }}
          className={`flex-1 py-3 px-2 sm:px-3 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer text-xs font-bold ${
            activeTab === 'pin'
              ? 'bg-[#0f8b5f] text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${activeTab === 'pin' ? 'text-white' : 'text-gray-500 dark:text-slate-400'}`} />
          <span className="truncate">Backup PIN</span>
        </button>
      </div>

      {/* 3. SECTION CONTENT BASED ON TAB */}

      {/* ===================== TAB 1: VEHICLE HANDOVER (DEFAULT) ===================== */}
      {activeTab === 'handover' && (
        <div className="space-y-3.5">
          {/* Section Header: LIVE KEY HANDOVERS & PICKUPS + Refresh */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-gray-800 dark:text-slate-200 uppercase tracking-wider">
              LIVE KEY HANDOVERS & PICKUPS
            </h2>
            <button
              type="button"
              onClick={fetchHandoverBookings}
              disabled={isRefreshing}
              className="text-xs font-bold text-[#0f8b5f] dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center space-x-1 transition cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Empty State vs List */}
          {activeHandovers.length === 0 ? (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs rounded-3xl border-2 border-dashed border-emerald-200/90 dark:border-slate-800 py-12 px-6 text-center space-y-3 shadow-2xs">
              {/* Radar Car Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 flex items-center justify-center">
                  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Left radar wave arcs */}
                    <path d="M 14 24 A 12 12 0 0 0 14 40" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 9 18 A 20 20 0 0 0 9 46" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                    
                    {/* Right radar wave arcs */}
                    <path d="M 50 24 A 12 12 0 0 1 50 40" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 55 18 A 20 20 0 0 1 55 46" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                    
                    {/* Center Green Car */}
                    <g transform="translate(17, 18)">
                      <rect x="0" y="14" width="4" height="12" rx="2" fill="#334155" />
                      <rect x="26" y="14" width="4" height="12" rx="2" fill="#334155" />
                      <path d="M 6 9 Q 10 1 15 1 Q 20 1 24 9 Z" fill="#059669" />
                      <path d="M 8 8 Q 11 3 15 3 Q 19 3 22 8 Z" fill="#ecfdf5" />
                      <rect x="3" y="9" width="24" height="16" rx="5" fill="#10b981" />
                      <circle cx="7" cy="14" r="2" fill="#ffffff" />
                      <circle cx="23" cy="14" r="2" fill="#ffffff" />
                      <rect x="11" y="17" width="8" height="4" rx="1.5" fill="#047857" />
                    </g>
                  </svg>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  No vehicle handovers pending right now.
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  When a driver arrives at your space and submits their odometer photo, it will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {activeHandovers.map((b) => {
                const isConfirmed = b.status === 'CONFIRMED';
                const isKeyPending =
                  b.status === 'DRIVER_ARRIVED' ||
                  b.status === 'ODOMETER_PHOTO_SUBMITTED' ||
                  b.status === 'KEY_HANDOVER_PENDING';
                const isParkingActive =
                  b.status === 'PARKING_ACTIVE' || b.status === 'KEY_RECEIVED' || b.status === 'ACTIVE';
                const isCollection = b.status === 'VEHICLE_COLLECTION_REQUESTED';
                const activeOtp = generatedOtps[b.id];

                return (
                  <div
                    key={b.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                      isCollection
                        ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-md ring-2 ring-amber-400/20'
                        : isKeyPending
                        ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 shadow-xs'
                        : isParkingActive
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-2xs'
                    }`}
                  >
                    {/* Collection alert banner */}
                    {isCollection && (
                      <div className="bg-amber-500 text-slate-950 p-2.5 rounded-xl flex items-center justify-between font-black text-xs shadow-xs">
                        <div className="flex items-center space-x-2">
                          <span>🚨</span>
                          <span>Driver ready for pickup • Provide Release OTP</span>
                        </div>
                        <span className="text-[10px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          Action Needed
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
                            Ref #{b.booking_reference}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              isCollection
                                ? 'bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200'
                                : isKeyPending
                                ? 'bg-purple-200 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200 animate-pulse'
                                : isParkingActive
                                ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
                            }`}
                          >
                            {b.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                          {b.listing?.title || 'Parking Space'}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-slate-400 pt-1">
                          <span className="flex items-center space-x-1">
                            <Car className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                            <span className="font-semibold text-gray-700 dark:text-slate-300">{b.vehicle?.registration_number || b.vehicle_license_plate || 'Vehicle Reg'}</span>
                          </span>
                          {b.user?.full_name && (
                            <span className="text-gray-500 dark:text-slate-400">
                              Driver: <span className="font-semibold text-gray-800 dark:text-slate-200">{b.user.full_name}</span>
                            </span>
                          )}
                          {b.user?.phone_number && (
                            <a
                              href={`tel:${b.user.phone_number}`}
                              className="text-[#0f8b5f] dark:text-emerald-400 font-semibold hover:underline flex items-center space-x-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{b.user.phone_number}</span>
                            </a>
                          )}
                        </div>

                        {/* Odometer Photo Inspection */}
                        {(b.odometer_photo_url || b.initial_odometer_photo_url) && (
                          <div className="pt-2">
                            <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                              Inspection Photo (Odometer & Exterior):
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto(b.odometer_photo_url || b.initial_odometer_photo_url || null)}
                              className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 w-28 h-20 bg-black flex items-center justify-center cursor-pointer shadow-2xs"
                            >
                              <img
                                src={b.odometer_photo_url || b.initial_odometer_photo_url}
                                alt="Odometer"
                                className="w-full h-full object-cover group-hover:opacity-80 transition"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-0.5 rounded-md">
                                  View
                                </span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="sm:self-center flex-shrink-0">
                        {isKeyPending && (
                          <button
                            type="button"
                            onClick={() => handleConfirmKeyReceived(b.id)}
                            disabled={handoverLoading === b.id}
                            className="bg-[#0f8b5f] hover:bg-emerald-700 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-xs shadow-sm flex items-center space-x-1.5 transition cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>{handoverLoading === b.id ? 'Confirming...' : 'Confirm Key Handover'}</span>
                          </button>
                        )}

                        {isConfirmed && (
                          <button
                            type="button"
                            onClick={() => handleConfirmKeyReceived(b.id)}
                            disabled={handoverLoading === b.id}
                            className="bg-[#0f8b5f] hover:bg-emerald-700 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Confirm Key Received</span>
                          </button>
                        )}

                        {isParkingActive && (
                          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 px-3.5 py-2 rounded-xl text-center shadow-2xs min-w-[140px]">
                            <div className="flex items-center justify-center space-x-1 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              <span>Vehicle Parked</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block mt-0.5">
                              Awaiting driver pickup
                            </span>
                          </div>
                        )}

                        {isCollection && (
                          activeOtp ? (
                            <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-500/80 p-2.5 rounded-2xl shadow-sm text-center min-w-[190px]">
                              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                                Release OTP
                              </span>
                              <span className="text-2xl font-black font-mono tracking-widest text-emerald-700 dark:text-emerald-400 block my-0.5">
                                {activeOtp.otp}
                              </span>
                              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold block">
                                Driver enters this to conclude trip
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGenerateReleaseOtp(b.id)}
                              disabled={handoverLoading === b.id}
                              className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow-md flex items-center space-x-2 transition cursor-pointer"
                            >
                              <Lock className="w-4 h-4" />
                              <span>{handoverLoading === b.id ? 'Generating...' : '🔐 Generate Release OTP'}</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: QR PASS VALIDATION ===================== */}
      {activeTab === 'qr' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-emerald-100 dark:border-slate-800 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-sm font-black text-gray-800 dark:text-slate-200 uppercase tracking-wider">
              Scan or Paste Driver QR Pass
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              Scan the QR code displayed on the driver's phone or enter the token string below
            </p>
          </div>

          <form onSubmit={handleCheckInWithQr} className="space-y-4">
            <div className="relative">
              <QrCode className="w-5 h-5 absolute left-3 top-3 text-[#0f8b5f] dark:text-emerald-400" />
              <input
                type="text"
                required
                placeholder="Paste QR Token (e.g. qr_tok_...)"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !qrToken.trim()}
              className="w-full bg-[#0f8b5f] hover:bg-emerald-700 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-xs transition text-xs sm:text-sm flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Validating Token...' : 'Validate Driver Entry & Check-in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {sessionData && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs text-emerald-950 dark:text-emerald-200 shadow-2xs animate-in fade-in">
              <div className="flex items-center space-x-2 font-black text-emerald-900 dark:text-emerald-300 text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>QR Pass Verified & Entry Authorized!</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-slate-400">
                Driver booking has been validated and recorded.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: BACKUP PIN CHECK-IN ===================== */}
      {activeTab === 'pin' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-emerald-100 dark:border-slate-800 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-sm font-black text-gray-800 dark:text-slate-200 uppercase tracking-wider">
              Backup Driver 4-Digit PIN
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              Ask the driver for the 4-digit Check-in PIN shown on their booking confirmation screen
            </p>
          </div>

          <form onSubmit={handleCheckInWithPin} className="space-y-5">
            {activeHandovers.some((b) => b.status === 'PARKING_ACTIVE' || b.status === 'KEY_RECEIVED' || b.status === 'ACTIVE') && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong>Tip:</strong> If you already received vehicle keys in the <em>Vehicle Handover</em> tab, check-in is already complete!
                </span>
              </div>
            )}

            {/* 4 Large Digit Input Boxes */}
            <div className="flex justify-center items-center space-x-3 sm:space-x-4 my-2">
              {pinDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={pinInputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-14 h-16 sm:w-16 sm:h-18 text-center text-3xl font-black font-mono rounded-2xl border-2 transition-all outline-none ${
                    digit
                      ? 'border-[#0f8b5f] bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300 shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800 text-gray-800 dark:text-white hover:border-gray-300 dark:hover:border-slate-600 focus:border-[#0f8b5f] focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10'
                  }`}
                  placeholder="•"
                />
              ))}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setPinDigits(['', '', '', '']);
                  pinInputRefs[0]?.current?.focus();
                }}
                className="text-xs font-semibold text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 px-3 py-1 rounded-lg cursor-pointer"
              >
                Clear Digits
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || fullPin.length < 4}
              className="w-full bg-[#0f8b5f] hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold py-3.5 px-4 rounded-xl shadow-sm transition text-xs sm:text-sm flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Validating PIN...' : 'Verify Driver PIN & Check-in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {sessionData && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs text-emerald-950 dark:text-emerald-200 shadow-2xs animate-in fade-in">
              <div className="flex items-center space-x-2 font-black text-emerald-900 dark:text-emerald-300 text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>{sessionData.is_already_active ? 'Vehicle Already Checked In & Safely Parked!' : 'Gate Access Verified & Check-in Active!'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 text-[11px]">
                <div>
                  <span className="text-gray-500 dark:text-slate-400 block">Session ID:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">#{sessionData.id || sessionData.booking_id || 1}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 block">Status:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">Active Parking</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photo Preview Modal if host clicks inspection photo */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl space-y-3 p-4 border border-transparent dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 dark:text-white">Vehicle Inspection Photo</span>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden aspect-4/3 bg-black">
              <img src={selectedPhoto} alt="Odometer Inspection" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HostPinVerificationPage;
