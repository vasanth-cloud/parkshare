import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Booking } from '../types';
import { QrCode, KeyRound, CheckCircle, AlertCircle, ShieldCheck, ArrowRight, Car, Lock, RotateCcw, Camera } from 'lucide-react';

export const HostPinVerificationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'qr' | 'pin' | 'handover'>('handover');
  const [qrToken, setQrToken] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Handover state
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [generatedOtps, setGeneratedOtps] = useState<Record<number, { otp: string; expires_at: string }>>({});
  const [handoverLoading, setHandoverLoading] = useState<number | null>(null);

  const fetchHandoverBookings = async () => {
    try {
      const data = await api.getHostBookings();
      setHostBookings(data || []);
    } catch {}
  };

  useEffect(() => {
    fetchHandoverBookings();
  }, []);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSessionData(null);
    setLoading(true);

    try {
      const res = await api.checkInSession({
        qr_token: activeTab === 'qr' && qrToken ? qrToken.trim() : undefined,
        verification_code: activeTab === 'pin' && pinCode ? pinCode.trim() : undefined,
      });

      setSessionData(res.session || res);
      setSuccessMsg(`Driver Check-in Validated! Session #${res.session?.id || res.id || 1} is now ACTIVE.`);
      fetchHandoverBookings();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Token or PIN is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmKeyReceived = async (bookingId: number) => {
    try {
      setHandoverLoading(bookingId);
      setError('');
      await api.confirmKeyReceived(bookingId);
      setSuccessMsg(`Key receipt confirmed! Booking #${bookingId} is now Parking Active.`);
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
      setSuccessMsg(`Vehicle Release OTP generated: ${res.release_otp}`);
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

  useEffect(() => {
    fetchHandoverBookings();
    const interval = setInterval(fetchHandoverBookings, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800 mx-auto">
          <KeyRound className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Host Gate Access & Vehicle Handover</h1>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Manage key handovers, verify vehicle inspections, and issue secure one-time vehicle release OTPs to conclude parking trips.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-6">
        {/* Verification Method Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('handover');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'handover' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Vehicle Handover ({activeHandovers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('qr');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'qr' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Pass</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('pin');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'pin' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Backup PIN</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-semibold border border-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl text-xs font-semibold border border-emerald-200 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Vehicle Handover & Release OTP */}
        {activeTab === 'handover' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                Live Key Handovers & Pickups
              </span>
              <button
                type="button"
                onClick={fetchHandoverBookings}
                className="text-xs text-emerald-700 font-bold hover:underline flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {activeHandovers.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl space-y-2">
                <Car className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs font-bold text-gray-700">No vehicle handovers pending right now.</p>
                <p className="text-[11px] text-gray-500">
                  When a driver arrives at your space and submits their odometer photo, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
                      className={`p-5 rounded-2xl border transition space-y-3.5 ${
                        isCollection
                          ? 'bg-amber-50/90 border-2 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                          : isKeyPending
                          ? 'bg-purple-50/80 border-2 border-purple-400 shadow-sm'
                          : isParkingActive
                          ? 'bg-emerald-50/50 border border-emerald-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {/* Driver End Parking Alert Banner */}
                      {isCollection && (
                        <div className="bg-amber-500 text-slate-950 p-3 rounded-xl flex items-center justify-between font-black text-xs animate-pulse shadow-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-base">🚨</span>
                            <span>DRIVER HAS GIVEN END PARKING! PROVIDE OTP TO CONCLUDE TRIP</span>
                          </div>
                          <span className="text-[10px] bg-slate-950 text-amber-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Action Required
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono font-bold text-gray-900 bg-white px-2.5 py-0.5 rounded-md border border-gray-200">
                              Ref #{b.booking_reference}
                            </span>
                            <span className="text-xs font-bold text-gray-600">Slot {b.space_number || 'A01'}</span>

                            {isCollection && (
                              <span className="bg-amber-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full">
                                End Parking Requested
                              </span>
                            )}
                            {isKeyPending && (
                              <span className="bg-purple-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full animate-pulse">
                                Key Handover Pending
                              </span>
                            )}
                            {isParkingActive && (
                              <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                                Parking Active
                              </span>
                            )}
                            {isConfirmed && (
                              <span className="bg-blue-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                                Confirmed (Awaiting Driver Arrival)
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-800 font-semibold pt-1">
                            Vehicle Plate: <strong className="font-mono">{b.vehicle?.registration_number || 'Vehicle'}</strong>
                            {b.odometer_reading && (
                              <span className="ml-2 font-mono text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md inline-flex items-center space-x-1">
                                <span>KM: {b.odometer_reading.toLocaleString()}</span>
                                {b.odometer_photo_url && (
                                  <a
                                    href={b.odometer_photo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-700 hover:text-emerald-950 underline font-sans text-[10px] ml-1.5"
                                    title="View timestamped live dashboard photo"
                                  >
                                    📸 Live Photo ↗
                                  </a>
                                )}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Space: <strong>{b.listing?.title}</strong> • Reserved until {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Action buttons & OTP display */}
                        <div className="sm:self-center">
                          {isKeyPending && (
                            <button
                              type="button"
                              onClick={() => handleConfirmKeyReceived(b.id)}
                              disabled={handoverLoading === b.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow-sm flex items-center space-x-1.5 transition"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{handoverLoading === b.id ? 'Confirming...' : 'Confirm Key Received'}</span>
                            </button>
                          )}

                          {isConfirmed && (
                            <button
                              type="button"
                              onClick={() => handleConfirmKeyReceived(b.id)}
                              disabled={handoverLoading === b.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs flex items-center space-x-1.5 transition"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Confirm Key Received</span>
                            </button>
                          )}

                          {isCollection && (
                            activeOtp ? (
                              <div className="bg-white border-2 border-emerald-500 p-3 rounded-2xl shadow-sm text-center min-w-[200px]">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                  Give This OTP to Driver
                                </span>
                                <span className="text-2xl font-black font-mono tracking-widest text-emerald-700 block my-0.5">
                                  {activeOtp.otp}
                                </span>
                                <span className="text-[10px] text-amber-700 font-semibold block">
                                  Trip will conclude once driver enters OTP
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleGenerateReleaseOtp(b.id)}
                                disabled={handoverLoading === b.id}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-black px-5 py-3 rounded-xl text-xs shadow-md flex items-center space-x-2 transition hover:scale-[1.02]"
                              >
                                <Lock className="w-4 h-4" />
                                <span>{handoverLoading === b.id ? 'Generating...' : '🔑 Generate Release OTP'}</span>
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

        {/* Tab 2: Primary QR Pass Form */}
        {activeTab === 'qr' && (
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase">
                Scan or Paste Booking QR Token
              </label>
              <div className="relative">
                <QrCode className="w-5 h-5 absolute left-3 top-3 text-emerald-600" />
                <input
                  type="text"
                  required
                  placeholder="Paste or scan QR Token (e.g. qr_tok_9821...)"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Backend validates encrypted reference token against active database reservations.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !qrToken}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Validating Token...' : 'Validate Driver Entry & Check-in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Tab 3: Backup PIN Form */}
        {activeTab === 'pin' && (
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase">
                Enter Driver 4-Digit Backup PIN
              </label>
              <input
                type="text"
                maxLength={4}
                required
                placeholder="e.g. 8492"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full text-center text-3xl font-mono tracking-widest px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
              />
              <p className="text-[11px] text-gray-500 text-center">
                Use when driver scanner is offline.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !pinCode}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Validating PIN...' : 'Validate Driver Entry & Check-in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {sessionData && (
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 space-y-2 text-xs text-emerald-950">
            <div className="flex items-center space-x-2 font-bold text-sm text-emerald-900">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Gate Access Verified & Check-in Confirmed</span>
            </div>
            <p>Session ID: <strong>#{sessionData.id || sessionData.booking_id}</strong></p>
            <p>Verification Method: <strong>{sessionData.verification_method || activeTab.toUpperCase()}</strong></p>
            <p>Check-in Timestamp: <strong>{new Date().toLocaleString()}</strong></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostPinVerificationPage;
