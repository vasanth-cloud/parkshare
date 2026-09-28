import React, { useState } from 'react';
import { api } from '../services/api';
import { Booking } from '../types';
import { Navigation, QrCode, Phone, Square, MapPin, X } from 'lucide-react';

export const ActiveParkingCard: React.FC<{ booking: Booking; onRefresh: () => void }> = ({ booking, onRefresh }) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding] = useState(false);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return iso;
    }
  };

  const handleEndParking = async () => {
    setEnding(true);
    try {
      await api.endParking(booking.id);
      setShowEndModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to end parking session');
    } finally {
      setEnding(false);
    }
  };

  const hostName = booking.host_name || 'Ravi';
  const hostPhone = booking.host_phone || '+91 98765 43210';
  const listingTitle = booking.listing?.title || `${hostName}'s Parking Space`;
  const address = booking.listing?.exact_address || booking.listing?.approximate_address || 'Indiranagar, Bengaluru';
  const lat = booking.listing?.latitude || 12.9784;
  const lng = booking.listing?.longitude || 77.6408;

  const destinationQuery = `${lat},${lng}`;

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

  return (
    <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-emerald-700/60 relative overflow-hidden my-4 space-y-5">
      {/* Glow pulse */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center space-x-2 bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-1 rounded-full text-xs font-black text-emerald-300 tracking-wider uppercase">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>ACTIVE PARKING</span>
        </div>
        <span className="text-xs text-emerald-200/80 font-mono font-bold">Ref: {booking.booking_reference}</span>
      </div>

      {/* Space Title & Address */}
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{listingTitle}</h2>
        <p className="text-xs text-emerald-200/90 flex items-center space-x-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>{address}</span>
        </p>
      </div>

      {/* Time Grid */}
      <div className="grid grid-cols-2 gap-4 bg-emerald-900/60 p-4 rounded-2xl border border-emerald-800/80 text-center">
        <div className="space-y-0.5 border-r border-emerald-800/60 pr-2">
          <span className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider block">Started</span>
          <span className="text-xl font-extrabold text-white">{formatTime(booking.start_time)}</span>
        </div>
        <div className="space-y-0.5 pl-2">
          <span className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider block">Ends</span>
          <span className="text-xl font-extrabold text-white">{formatTime(booking.end_time)}</span>
        </div>
      </div>

      {/* 4 Main Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <button
          onClick={handleNavigate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-2xl text-xs transition shadow-md flex items-center justify-center space-x-2 text-center"
        >
          <Navigation className="w-4 h-4" />
          <span>Navigation</span>
        </button>

        <button
          onClick={() => setShowQrModal(true)}
          className="bg-emerald-800/80 hover:bg-emerald-800 text-emerald-100 font-bold py-3 px-4 rounded-2xl text-xs transition border border-emerald-700 flex items-center justify-center space-x-2"
        >
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>Booking QR</span>
        </button>

        <button
          onClick={() => setShowContactModal(true)}
          className="bg-emerald-800/80 hover:bg-emerald-800 text-emerald-100 font-bold py-3 px-4 rounded-2xl text-xs transition border border-emerald-700 flex items-center justify-center space-x-2"
        >
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>Contact Host</span>
        </button>

        <button
          onClick={() => setShowEndModal(true)}
          className="bg-rose-600/90 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-2xl text-xs transition shadow-md flex items-center justify-center space-x-2"
        >
          <Square className="w-4 h-4 fill-white" />
          <span>End Parking</span>
        </button>
      </div>

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

            <h3 className="text-lg font-extrabold text-gray-900">Booking Verification QR</h3>
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
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Close QR Code
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Contact Host */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl relative border border-gray-100">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 mx-auto">
              <Phone className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-gray-900">{hostName}</h3>
              <p className="text-xs text-gray-500 mt-0.5">ParkShare Verified Space Host</p>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center space-y-1">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Host Phone Number</span>
              <span className="text-lg font-extrabold text-gray-900 font-mono">{hostPhone}</span>
            </div>

            <a
              href={`tel:${hostPhone}`}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-2"
            >
              <Phone className="w-4 h-4" />
              <span>Call {hostName} Now</span>
            </a>
          </div>
        </div>
      )}

      {/* Modal 3: End Parking Confirmation */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl relative border border-gray-100">
            <button
              onClick={() => setShowEndModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
              <Square className="w-6 h-6 fill-rose-600" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-gray-900">End Active Parking?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Confirming check-out will end your parking session for {listingTitle} and free up the space.
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs"
              >
                Keep Parking
              </button>

              <button
                onClick={handleEndParking}
                disabled={ending}
                className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm"
              >
                {ending ? 'Ending...' : 'Yes, End Parking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveParkingCard;
