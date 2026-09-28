import React, { useState } from 'react';
import { api } from '../services/api';
import { QrCode, KeyRound, CheckCircle, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';

export const HostPinVerificationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'qr' | 'pin'>('qr');
  const [qrToken, setQrToken] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

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
    } catch (err: any) {
      setError(err.message || 'Verification failed. Token or PIN is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800 mx-auto">
          <QrCode className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Host Gate Access & Check-in</h1>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Scan the driver's QR Access Pass or enter their 4-digit backup PIN code to validate gate entry.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-6">
        {/* Verification Method Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('qr');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'qr' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Primary: Scan QR Pass</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('pin');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'pin' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Backup: 4-Digit PIN</span>
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

        <form onSubmit={handleCheckIn} className="space-y-4">
          {activeTab === 'qr' ? (
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
          ) : (
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
          )}

          <button
            type="submit"
            disabled={loading || (activeTab === 'qr' ? !qrToken : !pinCode)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Validating Token...' : 'Validate Driver Entry & Check-in'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

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
