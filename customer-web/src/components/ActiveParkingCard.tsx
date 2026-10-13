import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { Booking } from '../types';
import {
  Navigation,
  QrCode,
  Phone,
  Square,
  MapPin,
  X,
  CheckCircle,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export const ActiveParkingCard: React.FC<{ booking: Booking; onRefresh: () => void }> = ({ booking, onRefresh }) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding] = useState(false);

  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Vehicle checkout OTP state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return iso;
    }
  };

  const hostName = booking.host_name || 'Host';
  const hostPhone = booking.host_phone || '+91 98765 43210';
  const listingTitle = booking.listing?.title || `${hostName}'s Parking Space`;
  const address = booking.listing?.exact_address || booking.listing?.approximate_address || 'Reserved Parking Location';
  const lat = booking.listing?.latitude;
  const lng = booking.listing?.longitude;

  const handleNavigate = () => {
    if (!lat || !lng) {
      if (address) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
      }
      return;
    }
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

  // Verify Host Release / Checkout OTP
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

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    const lastFilled = Math.min(pasted.length - 1, 5);
    document.getElementById(`otp-input-${lastFilled >= 0 ? lastFilled : 0}`)?.focus();
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
  const isPendingArrival =
    status === 'CONFIRMED' ||
    status === 'BOOKING_CREATED' ||
    status === 'DRIVER_ARRIVED';
  const isParkingActive =
    status === 'PARKING_ACTIVE' ||
    status === 'ACTIVE' ||
    status === 'KEY_RECEIVED' ||
    status === 'KEY_HANDOVER_PENDING' ||
    status === 'ODOMETER_PHOTO_SUBMITTED';
  const isCollectionRequested = status === 'VEHICLE_COLLECTION_REQUESTED';
  const isCompleted =
    status === 'COMPLETED' ||
    status === 'RELEASE_OTP_VERIFIED' ||
    status === 'VEHICLE_RELEASED';

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white rounded-3xl p-6 shadow-2xl border border-blue-600/40 relative overflow-hidden my-4 space-y-6">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header with Lifecycle Progress Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <span className="w-3 h-3 rounded-full bg-blue-400 animate-ping"></span>
          <div>
            <span className="text-xs font-mono font-bold text-blue-400 block tracking-wider uppercase">
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
          {isParkingActive && (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              Parking Active ✅
            </span>
          )}
          {isCollectionRequested && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
              Checkout In Progress
            </span>
          )}
          {isCompleted && (
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              Trip Completed ✅
            </span>
          )}
        </div>
      </div>

      {/* Visual State Machine Stepper */}
      <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
        <div
          className={`p-2.5 rounded-xl border flex items-center space-x-1.5 ${
            isPendingArrival || isParkingActive || isCollectionRequested || isCompleted
              ? 'bg-blue-950/80 border-blue-500 text-blue-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-500'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center font-black">
            1
          </span>
          <span className="truncate">1. En Route</span>
        </div>

        <div
          className={`p-2.5 rounded-xl border flex items-center space-x-1.5 ${
            isParkingActive || isCollectionRequested || isCompleted
              ? 'bg-blue-950/80 border-blue-500 text-blue-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-500'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center font-black">
            2
          </span>
          <span className="truncate">2. Parking Active</span>
        </div>

        <div
          className={`p-2.5 rounded-xl border flex items-center space-x-1.5 ${
            isCompleted
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : isCollectionRequested
              ? 'bg-amber-950/80 border-amber-500 text-amber-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-500'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center font-black">
            3
          </span>
          <span className="truncate">3. Completed</span>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-500/20 text-rose-200 border border-rose-500/40 p-3.5 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 1: CONFIRMED / EN ROUTE -> SHOW GATE PASS & PIN                 */}
      {/* ===================================================================== */}
      {isPendingArrival && (
        <div className="bg-slate-900/80 border border-blue-600/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Navigating to Parking Space</span>
              </h3>
              <p className="text-xs text-slate-300">{address}</p>
            </div>
            <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-1 rounded-lg font-bold border border-blue-400/30">
              Slot {booking.space_number || 'A01'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Start Time</span>
              <span className="text-sm font-extrabold text-white">{formatTime(booking.start_time)}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Scheduled End</span>
              <span className="text-sm font-extrabold text-white">{formatTime(booking.end_time)}</span>
            </div>
          </div>

          {/* Primary Action: Show Pass & PIN */}
          <div className="pt-2 space-y-2.5">
            <button
              onClick={() => setShowQrModal(true)}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 px-4 rounded-2xl text-sm transition shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2 cursor-pointer border-2 border-blue-400"
            >
              <QrCode className="w-5 h-5 text-cyan-300" />
              <span>🎟️ Show Gate Pass & 4-Digit PIN</span>
            </button>

            {/* Quick Secondary Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleNavigate}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-2 rounded-xl text-xs transition border border-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>Directions</span>
              </button>

              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-2 rounded-xl text-xs transition border border-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Call Host</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEndModal(true)}
                className="bg-rose-950/80 hover:bg-rose-900 text-rose-200 font-bold py-2.5 px-2 rounded-xl text-xs transition border border-rose-800/80 flex items-center justify-center space-x-1.5 cursor-pointer"
                title="End parking session"
              >
                <Square className="w-3.5 h-3.5 fill-rose-400" />
                <span>End Trip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 2: PARKING ACTIVE                                               */}
      {/* ===================================================================== */}
      {isParkingActive && (
        <div className="space-y-5">
          {/* Active Parking Status Card */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-blue-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-black text-emerald-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>VEHICLE SAFELY PARKED</span>
              </div>
              <p className="text-xs text-slate-300">
                Slot {booking.space_number || 'A01'} • Host {hostName} ({hostPhone})
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-blue-300 uppercase font-bold block">Scheduled End</span>
              <span className="text-lg font-black text-white">{formatTime(booking.end_time)}</span>
            </div>
          </div>

          {/* Prominent End Trip CTA */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setShowEndModal(true)}
              disabled={loadingAction}
              className="w-full bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black py-4 px-6 rounded-2xl text-sm transition shadow-xl shadow-rose-900/30 flex items-center justify-center space-x-2 hover:scale-[1.01] cursor-pointer border border-rose-400"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>🛑 End Trip / Checkout</span>
            </button>

            {/* Supporting Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleNavigate}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition border border-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>Directions</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition border border-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pass & PIN</span>
              </button>

              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition border border-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Call Host</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 3: VEHICLE CHECKOUT REQUESTED -> ENTER OWNER RELEASE OTP        */}
      {/* ===================================================================== */}
      {isCollectionRequested && (
        <div className="bg-slate-900/95 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
          <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-400/40">
            <Square className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
              FINAL VEHICLE CHECKOUT & TRIP CONCLUSION
            </span>
            <h3 className="text-xl font-black text-white">Enter Space Owner Checkout OTP</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You gave <strong>End Trip</strong>. Space owner <strong>{hostName}</strong> ({hostPhone}) must provide you the 6-digit checkout OTP.
              <strong className="block text-amber-300 mt-1">
                The trip will conclude and the parking space will be freed after this OTP is verified.
              </strong>
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
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className="w-11 h-14 sm:w-13 sm:h-16 text-center text-2xl font-black font-mono text-cyan-400 bg-slate-800 border-2 border-slate-600 focus:border-cyan-400 focus:bg-slate-900 rounded-2xl focus:outline-none transition shadow-inner"
                />
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Space owner can generate this OTP from their Host Dashboard / Host App
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3 max-w-sm mx-auto">
            <button
              onClick={handleVerifyOtp}
              disabled={loadingAction}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3.5 px-6 rounded-2xl text-xs transition shadow-xl flex items-center justify-center space-x-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loadingAction ? 'Verifying OTP...' : '✅ Verify Owner OTP & Complete Trip'}</span>
            </button>

            <a
              href={`tel:${hostPhone}`}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 px-4 rounded-2xl text-xs transition border border-slate-700 flex items-center justify-center space-x-1.5"
            >
              <Phone className="w-4 h-4 text-cyan-400" />
              <span>Call Owner</span>
            </a>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 4: COMPLETED SCREEN                                             */}
      {/* ===================================================================== */}
      {isCompleted && (
        <div className="bg-blue-950/60 border border-blue-500/60 rounded-3xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-blue-500/20 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white">Trip Completed • Vehicle Checked Out ✅</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Vehicle checkout completed and verified with Owner OTP.
            <strong className="block text-emerald-300 mt-1">The parking space is now freed and active for other drivers.</strong>
          </p>
        </div>
      )}

      {/* Modal 1: Booking QR Code & 4-Digit PIN */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl relative border border-gray-100">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-gray-900">Booking Gate Pass & PIN</h3>
            <p className="text-xs text-gray-500">Scan QR at parking barrier or share 4-digit backup PIN code with host.</p>

            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 flex flex-col items-center space-y-3">
              <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-center">
                <QRCodeSVG
                  value={booking.qr_token || booking.booking_reference}
                  size={140}
                  level="M"
                />
              </div>

              <div className="bg-white px-5 py-2.5 rounded-xl border border-blue-200 text-center w-full">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Backup Entry PIN</span>
                <span className="text-2xl font-black text-blue-700 font-mono tracking-widest">
                  {booking.verification_code || '4829'}
                </span>
              </div>
            </div>

            {/* Unlocked Address & Navigate */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-left text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-gray-800">Exact Location</span>
                <button
                  type="button"
                  onClick={handleNavigate}
                  className="text-xs font-black text-blue-600 hover:underline flex items-center space-x-0.5 cursor-pointer"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Navigate</span>
                </button>
              </div>
              <p className="text-gray-600 truncate">{address}</p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
            >
              Close Pass
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
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-700 font-extrabold text-lg">
                {hostName.charAt(0)}
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">{hostName}</h3>
              <p className="text-xs text-gray-500">Verified Space Host</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Phone:</span>
                <a href={`tel:${hostPhone}`} className="font-extrabold text-blue-600 hover:underline">
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition text-center shadow-xs"
              >
                <Phone className="w-4 h-4" />
                <span>Call Directly</span>
              </a>
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
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
            <h3 className="text-lg font-extrabold text-gray-900">End Trip & Checkout?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              When you initiate End Trip, space owner <strong>{hostName}</strong> will provide a 6-digit Checkout OTP.
              <strong className="block text-rose-700 mt-1">
                The trip will conclude and the parking space will be freed once you verify the owner's OTP.
              </strong>
            </p>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleEndParking}
                disabled={ending}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                {ending ? 'Requesting...' : 'Request Owner OTP & End Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
