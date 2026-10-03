import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Zap, Lock, Mail, Phone, User as UserIcon, DollarSign, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const CaptainAuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>(initialTab);
  
  // Form fields
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
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Mobile OTP Handlers
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      setError('Please provide a valid 10-digit mobile number');
      return;
    }
    setError('');
    setSendingPhoneOtp(true);
    try {
      const res = await api.sendMobileOtp(phone.trim());
      setIsPhoneOtpSent(true);
      if (res.sms_delivered) {
        setInfoMsg(`✓ 6-digit verification code dispatched via real SMS to ${phone}.`);
        setPhoneOtp('');
      } else if (res.dev_otp) {
        setPhoneOtp(res.dev_otp);
        setInfoMsg(`✓ Verification code: ${res.dev_otp} (Auto-filled / check background terminal)`);
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
        setInfoMsg(`✓ 6-digit verification code sent to ${email}. Please check your email inbox.`);
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
    setInfoMsg('');
    setSubmitting(true);

    try {
      if (authTab === 'signup') {
        if (!isPhoneVerified) {
          setError('Please verify your mobile number with OTP first.');
          setSubmitting(false);
          return;
        }
        if (!isEmailVerified) {
          setError('Please verify your email address with OTP first.');
          setSubmitting(false);
          return;
        }

        await register({
          email,
          password,
          full_name: fullName,
          phone_number: phone,
          role: 'HOST',
        });
      }

      await login(email, password);
      navigate('/captain');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      
      {/* Captain App Brand Header */}
      <div className="text-center max-w-md mx-auto mb-8 space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black mx-auto shadow-lg shadow-amber-500/20">
          <Zap className="w-9 h-9 fill-slate-950" />
        </div>
        <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-wider rounded-full border border-amber-500/30">
          ⚡ ParkShare Captain App
        </span>
        <h1 className="text-3xl font-black tracking-tight text-white">Earn Money From Your Space</h1>
        <p className="text-xs text-slate-400 font-medium">Turn driveways, apartment bays, or garages into daily passive income.</p>
      </div>

      {/* Captain Auth Card */}
      <div className="max-w-md w-full bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-2xl shadow-amber-500/10 space-y-6">
        
        {/* Sign In / Sign Up Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
          <button
            type="button"
            onClick={() => setAuthTab('signin')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              authTab === 'signin'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Captain Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthTab('signup')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              authTab === 'signup'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Captain Sign Up
          </button>
        </div>



        {infoMsg && (
          <div className="bg-emerald-950/80 text-emerald-300 text-xs p-3 rounded-xl border border-emerald-800 text-center font-semibold flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{infoMsg}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/80 text-rose-300 text-xs p-3 rounded-xl border border-rose-800 text-center font-semibold">
            {error}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {authTab === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Full Name</label>
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700">
                <UserIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rajesh Sharma"
                  className="bg-transparent text-sm w-full outline-none text-white placeholder-slate-500"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-300">Email Address</label>
              {authTab === 'signup' && (
                isEmailVerified ? (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold">Email OTP Required</span>
                )
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700 flex-1">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="email"
                  required
                  disabled={authTab === 'signup' && isEmailVerified}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="captain@parkshare.com"
                  className="bg-transparent text-sm w-full outline-none text-white placeholder-slate-500 disabled:opacity-60"
                />
              </div>
              {authTab === 'signup' && !isEmailVerified && (
                <button
                  type="button"
                  disabled={sendingEmailOtp}
                  onClick={handleSendEmailOtp}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition flex-shrink-0 disabled:opacity-50"
                >
                  {sendingEmailOtp ? 'Sending...' : isEmailOtpSent ? 'Resend' : 'Send OTP'}
                </button>
              )}
            </div>

            {authTab === 'signup' && isEmailOtpSent && !isEmailVerified && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  placeholder="6-digit Email OTP"
                  className="w-36 px-3 py-1.5 bg-slate-800 border border-amber-500/50 rounded-xl text-xs font-mono tracking-widest text-center text-white outline-none"
                />
                <button
                  type="button"
                  disabled={verifyingEmailOtp || emailOtp.length !== 6}
                  onClick={handleVerifyEmailOtp}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {verifyingEmailOtp ? 'Verifying...' : 'Verify'}
                </button>
                <span className="text-[10px] text-slate-400">Check Gmail inbox</span>
              </div>
            )}
          </div>

          {authTab === 'signup' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-300">Mobile Phone Number</label>
                {isPhoneVerified ? (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold">Mobile OTP Required</span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex items-center space-x-2 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700 flex-1">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="tel"
                    required
                    disabled={isPhoneVerified}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="bg-transparent text-sm w-full outline-none text-white placeholder-slate-500 disabled:opacity-60"
                  />
                </div>
                {!isPhoneVerified && (
                  <button
                    type="button"
                    disabled={sendingPhoneOtp}
                    onClick={handleSendPhoneOtp}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition flex-shrink-0 disabled:opacity-50"
                  >
                    {sendingPhoneOtp ? 'Sending...' : isPhoneOtpSent ? 'Resend' : 'Send OTP'}
                  </button>
                )}
              </div>

              {isPhoneOtpSent && !isPhoneVerified && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    placeholder="6-digit Mobile OTP"
                    className="w-36 px-3 py-1.5 bg-slate-800 border border-amber-500/50 rounded-xl text-xs font-mono tracking-widest text-center text-white outline-none"
                  />
                  <button
                    type="button"
                    disabled={verifyingPhoneOtp || phoneOtp.length !== 6}
                    onClick={handleVerifyPhoneOtp}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {verifyingPhoneOtp ? 'Verifying...' : 'Verify'}
                  </button>
                  <span className="text-[10px] text-amber-300">Auto-filled (or check background terminal)</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Password</label>
            <div className="flex items-center space-x-2 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent text-sm w-full outline-none text-white placeholder-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm disabled:opacity-50"
          >
            {submitting
              ? 'Authenticating...'
              : authTab === 'signin'
              ? 'Sign In to Captain App'
              : 'Register as Captain'}
          </button>

        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          <span>Are you looking to park? </span>
          <Link to="/driver/auth" className="text-emerald-400 font-extrabold hover:underline">
            Go to Driver App
          </Link>
        </div>

      </div>

    </div>
  );
};
