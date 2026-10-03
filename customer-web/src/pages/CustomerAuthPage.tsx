import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Car, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Phone, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles 
} from 'lucide-react';

export const CustomerAuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Mobile OTP States
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);

  // Email OTP States
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);

  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Mobile OTP Handlers
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      setError('Please provide a valid 10-digit mobile number (e.g. +91 9876543210)');
      return;
    }
    setError('');
    setSendingPhoneOtp(true);
    try {
      const res = await api.sendMobileOtp(phone.trim());
      setIsPhoneOtpSent(true);
      if (res.sms_delivered) {
        setInfoMsg(`✓ 6-digit verification code dispatched via real SMS to ${phone}. Please check your phone SMS.`);
        setPhoneOtp('');
      } else if (res.dev_otp) {
        setPhoneOtp(res.dev_otp);
        setInfoMsg(`✓ Verification code: ${res.dev_otp} (Auto-filled)`);
      } else {
        setInfoMsg(res.message);
        setPhoneOtp('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send Mobile OTP');
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP received on your mobile');
      return;
    }
    setError('');
    setVerifyingPhoneOtp(true);
    try {
      await api.verifyMobileOtp(phone.trim(), phoneOtp.trim());
      setIsPhoneVerified(true);
      setInfoMsg('✓ Mobile number successfully verified via SMS OTP!');
    } catch (err: any) {
      setError(err.message || 'Invalid Mobile OTP');
    } finally {
      setVerifyingPhoneOtp(false);
    }
  };

  // Email OTP Handlers
  const handleSendEmailOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setSendingEmailOtp(true);
    try {
      const res = await api.sendEmailOtp(email.trim().toLowerCase());
      setIsEmailOtpSent(true);
      if (res.email_delivered) {
        setInfoMsg(`✓ 6-digit verification code dispatched via email to ${email}. Please check your inbox or spam.`);
      } else {
        setInfoMsg(res.message);
      }
      setEmailOtp('');
    } catch (err: any) {
      setError(err.message || 'Failed to send Email OTP');
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP received in your email');
      return;
    }
    setError('');
    setVerifyingEmailOtp(true);
    try {
      await api.verifyEmailOtp(email.trim().toLowerCase(), emailOtp.trim());
      setIsEmailVerified(true);
      setInfoMsg('✓ Email address successfully verified via Email OTP!');
    } catch (err: any) {
      setError(err.message || 'Invalid Email OTP');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login(email, password);
        login(res.access_token, res.user);
        navigate('/search');
      } else {
        await api.register({
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
          phone_number: phone.trim(),
          phone_verified: isPhoneVerified,
          email_verified: isEmailVerified,
        });
        // Auto login after register
        const res = await api.login(email.trim().toLowerCase(), password);
        login(res.access_token, res.user);
        navigate('/search');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50/30 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-8 border border-emerald-100 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl text-emerald-700 mb-2 shadow-inner">
            <Car className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {isLogin ? 'Welcome Back, Driver!' : 'Create Verified Driver Account'}
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            {isLogin 
              ? 'Sign in to access your reserved parking spaces & passes' 
              : 'Join ParkShare to book secure neighborhood parking spots'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
              setInfoMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              isLogin ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
              setInfoMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              !isLogin ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Driver Sign Up (with OTP)
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-medium flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Legal Name</label>
              <div className="relative">
                <UserIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-gray-900"
                />
              </div>
            </div>
          )}

          {/* Phone Number with OTP Verification */}
          {!isLogin && (
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mobile Phone Verification</span>
                </label>
                {isPhoneVerified ? (
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Mobile Verified
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    OTP Required
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="tel"
                    required
                    disabled={isPhoneVerified}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                {!isPhoneVerified && (
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={sendingPhoneOtp || !phone}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 whitespace-nowrap flex items-center space-x-1"
                  >
                    {sendingPhoneOtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isPhoneOtpSent ? 'Resend OTP' : 'Send OTP'}</span>
                  </button>
                )}
              </div>

              {isPhoneOtpSent && !isPhoneVerified && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    maxLength={6}
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit SMS OTP"
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-sm tracking-widest text-center font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPhoneOtp}
                    disabled={verifyingPhoneOtp || phoneOtp.length !== 6}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {verifyingPhoneOtp ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Email Address with OTP Verification */}
          <div className={!isLogin ? "p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3" : ""}>
            {!isLogin && (
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Email Verification</span>
                </label>
                {isEmailVerified ? (
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Email Verified
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    OTP Required
                  </span>
                )}
              </div>
            )}

            {isLogin && (
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  required
                  disabled={!isLogin && isEmailVerified}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@example.com"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              {!isLogin && !isEmailVerified && (
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={sendingEmailOtp || !email}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 whitespace-nowrap flex items-center space-x-1"
                >
                  {sendingEmailOtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isEmailOtpSent ? 'Resend OTP' : 'Send OTP'}</span>
                </button>
              )}
            </div>

            {!isLogin && isEmailOtpSent && !isEmailVerified && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit Email OTP"
                  className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-sm tracking-widest text-center font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleVerifyEmailOtp}
                  disabled={verifyingEmailOtp || emailOtp.length !== 6}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 whitespace-nowrap"
                >
                  {verifyingEmailOtp ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-gray-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Verified Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setInfoMsg('');
            }}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            {isLogin ? "Don't have a driver account? Register here with OTP" : 'Already have an account? Sign In'}
          </button>
        </div>

      </div>
    </div>
  );
};

