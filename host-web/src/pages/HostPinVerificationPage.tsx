import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  QrCode, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft
} from 'lucide-react';

export const HostPinVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  // Tabs: 'qr' and 'pin'
  const [activeTab, setActiveTab] = useState<'qr' | 'pin'>('qr');

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
    } catch (err: any) {
      const rawMsg = err.message || '';
      if (rawMsg.includes('PARKING_ACTIVE') || rawMsg.includes('already active') || rawMsg.includes('already parking active')) {
        setSuccessMsg(`✓ This vehicle is already checked in and actively parked!`);
        setError('');
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
    } catch (err: any) {
      const rawMsg = err.message || '';
      if (rawMsg.includes('PARKING_ACTIVE') || rawMsg.includes('already active') || rawMsg.includes('already parking active')) {
        setSuccessMsg(`✓ This vehicle is already checked in and actively parked!`);
        setError('');
      } else {
        const cleaned = rawMsg.replace(/BookingStatusEnum\./g, '').replace(/_/g, ' ');
        setError(cleaned || 'Invalid or expired QR Token.');
      }
    } finally {
      setLoading(false);
    }
  };

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
          🚗 Driver Gate Check-in
        </span>
      </div>

      {/* 1. TOP HERO BANNER: Gate Access & Check-In */}
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
          Host Gate Access & Check-In
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Scan customer QR passes or enter backup 4-digit PINs to check-in arriving vehicles and authorize parking access.
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

      {/* 2. SEGMENTED TABS CONTAINER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-sm border border-emerald-100 dark:border-slate-800 flex items-center justify-between gap-1.5 transition-colors duration-200">
        {/* Tab 1: QR Pass */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('qr');
            setError('');
            setSuccessMsg('');
          }}
          className={`flex-1 py-3 px-3 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer text-xs font-bold ${
            activeTab === 'qr'
              ? 'bg-[#0f8b5f] text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          <QrCode className={`w-4 h-4 ${activeTab === 'qr' ? 'text-white' : 'text-gray-500 dark:text-slate-400'}`} />
          <span className="truncate">Scan / Enter QR Pass</span>
        </button>

        {/* Tab 2: Backup PIN */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('pin');
            setError('');
            setSuccessMsg('');
          }}
          className={`flex-1 py-3 px-3 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer text-xs font-bold ${
            activeTab === 'pin'
              ? 'bg-[#0f8b5f] text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${activeTab === 'pin' ? 'text-white' : 'text-gray-500 dark:text-slate-400'}`} />
          <span className="truncate">Backup 4-Digit PIN</span>
        </button>
      </div>

      {/* 3. SECTION CONTENT BASED ON TAB */}

      {/* ===================== TAB 1: QR PASS VALIDATION ===================== */}
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

      {/* ===================== TAB 2: BACKUP PIN CHECK-IN ===================== */}
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

    </div>
  );
};

export default HostPinVerificationPage;
