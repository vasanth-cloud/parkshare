import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Phone, 
  ArrowRight, 
  Building, 
  ShieldCheck, 
  CheckCircle2, 
  Camera, 
  FileText, 
  Sparkles, 
  AlertCircle,
  Upload,
  RefreshCw,
  X
} from 'lucide-react';

export const HostAuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(
    searchParams.get('mode') !== 'signup' && searchParams.get('mode') !== 'register'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [legalName, setLegalName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');

  // Host Verification States (OTP)
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);

  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);

  // Profile Photo: Live Camera + Device Upload
  const [photoMode, setPhotoMode] = useState<'upload' | 'camera'>('upload');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Government ID (Aadhaar / PAN / DL / Passport)
  const [govIdType, setGovIdType] = useState<'AADHAAR' | 'PAN' | 'DRIVING_LICENCE' | 'PASSPORT'>('AADHAAR');
  const [govIdNumber, setGovIdNumber] = useState('');

  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Stop camera stream safely
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // 1. Mobile OTP Handlers
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      setError('Please provide a valid 10-digit mobile number with country code (e.g. +91 9876543210)');
      return;
    }
    setError('');
    setSendingPhoneOtp(true);
    try {
      const res = await api.sendMobileOtp(phone.trim());
      setIsPhoneOtpSent(true);
      if (res.sms_delivered) {
        setInfoMsg(`✓ 6-digit verification code has been dispatched via real SMS to ${phone}. Please check your phone SMS.`);
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

  // 2. Email OTP Handlers
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
        setInfoMsg(`✓ 6-digit verification code has been dispatched via email to ${email}. Please check your inbox or spam.`);
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

  // 3. Camera Live Photo Handlers
  const startCamera = async () => {
    setError('');
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setError('Camera access denied or unavailable. Please upload a photo from your device instead.');
    }
  };

  const captureLivePhoto = async () => {
    if (!videoRef.current) return;
    try {
      setIsUploadingPhoto(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas');

      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Failed to capture photo frame');
          setIsUploadingPhoto(false);
          return;
        }
        try {
          const uploadRes = await api.uploadFile(blob, 'host_live_photo.jpg');
          setProfilePhotoUrl(uploadRes.url);
          stopCamera();
          setInfoMsg('✓ Live face photo captured successfully!');
        } catch (err: any) {
          setError(err.message || 'Failed to upload captured photo');
        } finally {
          setIsUploadingPhoto(false);
        }
      }, 'image/jpeg', 0.9);
    } catch (err: any) {
      setError(err.message || 'Failed to capture live photo');
      setIsUploadingPhoto(false);
    }
  };

  const handleDevicePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, or WebP).');
      return;
    }

    setError('');
    setIsUploadingPhoto(true);
    try {
      const res = await api.uploadFile(file, file.name);
      setProfilePhotoUrl(res.url);
      setInfoMsg('✓ Profile photo uploaded successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // 4. Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login(email.trim().toLowerCase(), password);
        login(res.access_token, res.user);
        navigate('/dashboard');
      } else {
        // Enforce mandatory verification items during host registration
        if (!legalName || legalName.trim().length < 2) {
          setError('Full legal name is mandatory.');
          setLoading(false);
          return;
        }
        if (!isPhoneVerified) {
          setError('Mobile SMS OTP verification is mandatory for host accounts.');
          setLoading(false);
          return;
        }
        if (!isEmailVerified) {
          setError('Email OTP verification is mandatory for host accounts.');
          setLoading(false);
          return;
        }
        if (!profilePhotoUrl) {
          setError('Host profile photo (live camera or uploaded from device) is mandatory.');
          setLoading(false);
          return;
        }
        if (!govIdNumber || govIdNumber.trim().length < 4) {
          setError(`Government ID document number (${govIdType}) is mandatory.`);
          setLoading(false);
          return;
        }

        const cleanId = govIdNumber.trim().replace(/\s+/g, '').toUpperCase();

        // Register host with all verified details
        await api.registerHost({
          email: email.trim().toLowerCase(),
          password,
          full_name: legalName.trim(),
          legal_name: legalName.trim(),
          phone_number: phone.trim(),
          payout_upi_id: upiId || 'host@upi',
          profile_photo_url: profilePhotoUrl,
          gov_id_type: govIdType,
          gov_id_number: cleanId,
          gov_id_document_url: profilePhotoUrl,
          phone_verified: true,
          email_verified: true,
        });

        const res = await api.login(email.trim().toLowerCase(), password);
        login(res.access_token, res.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Host authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className={`w-full ${isLogin ? 'max-w-md' : 'max-w-2xl'} bg-white rounded-3xl shadow-xl p-8 border border-emerald-100 space-y-6 transition-all`}>
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl text-emerald-800 mb-2">
            <Building className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isLogin ? 'Host Portal Sign In' : 'Register Verified Space Host'}
          </h2>
          <p className="text-sm text-gray-500">
            {isLogin
              ? 'Manage your listed parking spaces & daily earnings'
              : 'Automated e-KYC Verification required to list private spaces'}
          </p>
        </div>

        {/* Prominent Sign In vs Sign Up Tab Switcher */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setIsLogin(true);
              setError('');
              setInfoMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              isLogin
                ? 'bg-white text-emerald-800 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Host Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
              setInfoMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              !isLogin
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Host Sign Up & e-KYC (with OTP)</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{infoMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin ? (
            /* Multi-step / Verified Onboarding Fields */
            <div className="space-y-5">
              {/* Mandatory Checklist Header */}
              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <span className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Mandatory Host Identity Requirements:</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-800">5/5 Verified before listing</span>
              </div>

              {/* 1. Full Legal Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  1. Full Legal Name (As on Government ID) *
                </label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar Sharma"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-gray-900"
                  />
                </div>
              </div>

              {/* 2. Mobile Number + SMS OTP Verification */}
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    2. Mobile Number + SMS OTP Verification *
                  </label>
                  {isPhoneVerified ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>OTP Verified</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Verification Required
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="tel"
                      required
                      disabled={isPhoneVerified}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                  {!isPhoneVerified && (
                    <button
                      type="button"
                      disabled={sendingPhoneOtp}
                      onClick={handleSendPhoneOtp}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 disabled:opacity-50"
                    >
                      {sendingPhoneOtp ? 'Sending...' : isPhoneOtpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  )}
                </div>

                {isPhoneOtpSent && !isPhoneVerified && (
                  <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                    <input
                      type="text"
                      maxLength={6}
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="w-40 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={verifyingPhoneOtp || phoneOtp.length !== 6}
                      onClick={handleVerifyPhoneOtp}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {verifyingPhoneOtp ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <span className="text-[11px] text-gray-500">Check phone SMS</span>
                  </div>
                )}
              </div>

              {/* 3. Email Address + OTP Verification */}
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    3. Email Address + Email OTP Verification *
                  </label>
                  {isEmailVerified ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Email Verified</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Verification Required
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="email"
                      required
                      disabled={isEmailVerified}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="host@example.com"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                  {!isEmailVerified && (
                    <button
                      type="button"
                      disabled={sendingEmailOtp}
                      onClick={handleSendEmailOtp}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 disabled:opacity-50"
                    >
                      {sendingEmailOtp ? 'Sending...' : isEmailOtpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  )}
                </div>

                {isEmailOtpSent && !isEmailVerified && (
                  <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                    <input
                      type="text"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="w-40 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={verifyingEmailOtp || emailOtp.length !== 6}
                      onClick={handleVerifyEmailOtp}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {verifyingEmailOtp ? 'Verifying...' : 'Verify Email'}
                    </button>
                    <span className="text-[11px] text-gray-500">Check email inbox</span>
                  </div>
                )}
              </div>

              {/* 4. Profile Photo: Live Camera OR Upload from Device */}
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>4. Host Profile Photo (Live Camera or Upload) *</span>
                  </label>
                  {profilePhotoUrl && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Attached
                    </span>
                  )}
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex rounded-xl bg-gray-200/80 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setPhotoMode('upload');
                    }}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                      photoMode === 'upload' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload from Device</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMode('camera');
                      startCamera();
                    }}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                      photoMode === 'camera' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Live Photo (Webcam)</span>
                  </button>
                </div>

                {/* Upload from Device View */}
                {photoMode === 'upload' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleDevicePhotoUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1.5"
                    >
                      <Upload className="w-6 h-6 text-emerald-600" />
                      <p className="text-xs font-bold text-emerald-900">Click to select photo from device</p>
                      <p className="text-[10px] text-gray-500">JPG, PNG, or WebP</p>
                    </div>
                  </div>
                )}

                {/* Live Camera View */}
                {photoMode === 'camera' && (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-emerald-500/50 shadow-inner">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                      {!isCameraActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white p-3 space-y-1.5">
                          <Camera className="w-6 h-6 text-emerald-400" />
                          <p className="text-xs font-medium">Camera is inactive</p>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Start Webcam</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isCameraActive && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isUploadingPhoto}
                          onClick={captureLivePhoto}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{isUploadingPhoto ? 'Uploading Frame...' : 'Capture Photo'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview */}
                {profilePhotoUrl && (
                  <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-gray-200">
                    <img
                      src={profilePhotoUrl}
                      alt="Host Photo Preview"
                      className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">Photo Attached</p>
                      <p className="text-[10px] text-emerald-600">Ready for automated KYC match</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfilePhotoUrl('')}
                      className="p-1 text-gray-400 hover:text-rose-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 5. Government ID Verification (Automated e-KYC) */}
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/80 space-y-2.5">
                <label className="block text-xs font-bold text-gray-700 uppercase flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>5. Government ID (Automated e-KYC Verification) *</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'AADHAAR', label: 'Aadhaar Card', icon: '🪪' },
                    { id: 'PAN', label: 'PAN Card', icon: '💳' },
                    { id: 'DRIVING_LICENCE', label: 'Driving Licence', icon: '🚗' },
                    { id: 'PASSPORT', label: 'Passport', icon: '🛂' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGovIdType(item.id as any)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 transition ${
                        govIdType === item.id
                          ? 'bg-emerald-100 border-emerald-600 text-emerald-950 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <input
                    type="text"
                    required
                    value={govIdNumber}
                    onChange={(e) => setGovIdNumber(e.target.value.toUpperCase())}
                    placeholder={
                      govIdType === 'AADHAAR'
                        ? '12-Digit Aadhaar (e.g. 5482 1928 3041)'
                        : govIdType === 'PAN'
                        ? '10-Char PAN (e.g. ABCDE1234F)'
                        : govIdType === 'DRIVING_LICENCE'
                        ? 'DL Number (e.g. KA01 20210012345)'
                        : 'Passport Number (e.g. Z1234567)'
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono tracking-wider focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-900 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Instant e-KYC Verification via Automated Identity Provider</span>
                  </span>
                  <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">
                    No Admin Review
                  </span>
                </div>
              </div>

              {/* Payout & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Payout UPI ID (for earnings)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="name@okaxis / mobile@upi"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password *</label>
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
              </div>
            </div>
          ) : (
            /* Login Fields */
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="host@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
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
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
          >
            <span>{loading ? 'Processing...' : isLogin ? 'Sign In to Host Portal' : 'Complete Verification & Register'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => {
              stopCamera();
              setIsLogin(!isLogin);
              setError('');
              setInfoMsg('');
            }}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            {isLogin ? 'New host? Complete Identity Verification & Register' : 'Already have a verified host account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};
