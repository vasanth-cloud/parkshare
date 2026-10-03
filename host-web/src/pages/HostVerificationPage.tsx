import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { VerificationStatus } from '../types';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  User as UserIcon, 
  Camera, 
  Upload, 
  ArrowRight, 
  Sparkles,
  Check,
  CreditCard,
  Building,
  RefreshCw,
  PlusCircle,
  LayoutDashboard
} from 'lucide-react';

export const HostVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form states
  const [legalName, setLegalName] = useState('');
  
  // Mobile Verification State
  const [phone, setPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);

  // Email Verification State
  const [email, setEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);

  // Profile Photo State (Live Camera + Device Upload)
  const [photoMode, setPhotoMode] = useState<'upload' | 'camera'>('upload');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Government ID State (Aadhaar / PAN / DL / Passport)
  const [govIdType, setGovIdType] = useState<'AADHAAR' | 'PAN' | 'DRIVING_LICENCE' | 'PASSPORT'>('AADHAAR');
  const [govIdNumber, setGovIdNumber] = useState('');
  const [govIdDocUrl, setGovIdDocUrl] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Stop camera when closing or unmounting
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

  const loadStatus = async () => {
    try {
      const status = await api.getVerificationStatus();
      setVerificationStatus(status);
      if (status.legal_name) setLegalName(status.legal_name);
      if (status.phone_number) setPhone(status.phone_number);
      if (status.phone_verified) setIsPhoneVerified(true);
      if (status.email) setEmail(status.email);
      if (status.email_verified) setIsEmailVerified(true);
      if (status.profile_photo_url) setProfilePhotoUrl(status.profile_photo_url);
      if (status.gov_id_type) setGovIdType(status.gov_id_type as any);
      if (status.gov_id_number) setGovIdNumber(status.gov_id_number);
      if (status.gov_id_document_url) setGovIdDocUrl(status.gov_id_document_url);
    } catch (err) {
      console.error('Failed to load verification status', err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // 1. Mobile OTP Handlers
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number (e.g. +91 9876543210)');
      return;
    }
    setError('');
    setSendingPhoneOtp(true);
    try {
      const res = await api.sendMobileOtp(phone.trim());
      setIsPhoneOtpSent(true);
      if (res.sms_delivered) {
        setSuccessMsg(`✓ 6-digit verification code has been dispatched via real SMS to ${phone}.`);
        setPhoneOtp('');
      } else if (res.dev_otp) {
        setPhoneOtp(res.dev_otp);
        setSuccessMsg(`✓ Verification code: ${res.dev_otp} (Auto-filled / check background terminal)`);
      } else {
        setSuccessMsg(res.message);
        setPhoneOtp('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send Mobile OTP. Please check the mobile number.');
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
      setSuccessMsg('✓ Mobile number successfully verified via SMS OTP!');
    } catch (err: any) {
      setError(err.message || 'Invalid Mobile OTP. Please enter the correct 6-digit code.');
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
        setSuccessMsg(`✓ Verification code dispatched to ${email}. Please check your email inbox.`);
      } else {
        setSuccessMsg(res.message);
      }
      setEmailOtp('');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch Email OTP. Please check your email.');
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP sent to your email');
      return;
    }
    setError('');
    setVerifyingEmailOtp(true);
    try {
      await api.verifyEmailOtp(email.trim().toLowerCase(), emailOtp.trim());
      setIsEmailVerified(true);
      setSuccessMsg('✓ Email address successfully verified via OTP!');
    } catch (err: any) {
      setError(err.message || 'Invalid Email OTP. Please check your inbox or spam.');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // 3. Live Web Camera Handlers
  const startCamera = async () => {
    setError('');
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      setError('Unable to access device camera. Please upload an image from your device instead.');
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
      if (!ctx) throw new Error('Failed to create canvas context');

      // Mirror horizontally for selfie feel
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Failed to capture image frame');
          setIsUploadingPhoto(false);
          return;
        }
        try {
          const res = await api.uploadFile(blob, 'host_live_photo.jpg');
          setProfilePhotoUrl(res.url);
          stopCamera();
          setSuccessMsg('✓ Live facial photo captured and uploaded successfully!');
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

  // 4. Device Upload Handler for Profile Photo
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
      setSuccessMsg('✓ Profile photo uploaded from device successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo from device');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // 5. Device Upload Handler for Government ID Document
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsUploadingDoc(true);
    try {
      const res = await api.uploadFile(file, file.name);
      setGovIdDocUrl(res.url);
      setSuccessMsg(`✓ ${govIdType} document uploaded for automated KYC verification!`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload ID document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // 6. Submit Host Identity
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!legalName || legalName.trim().length < 2) {
      setError('Full legal name is mandatory and must match your Government ID.');
      return;
    }
    if (!isPhoneVerified) {
      setError('Please verify your mobile number with OTP before submitting.');
      return;
    }
    if (!isEmailVerified) {
      setError('Please verify your email address with OTP before submitting.');
      return;
    }
    if (!profilePhotoUrl) {
      setError('A profile photo (live camera capture or uploaded from device) is mandatory.');
      return;
    }
    if (!govIdNumber || govIdNumber.trim().length < 4) {
      setError(`Please enter your valid ${govIdType} document number.`);
      return;
    }

    // Client-side quick format check
    const cleanId = govIdNumber.trim().replace(/\s+/g, '').toUpperCase();
    if (govIdType === 'AADHAAR' && cleanId.length !== 12) {
      setError('Aadhaar number must contain exactly 12 numeric digits.');
      return;
    }
    if (govIdType === 'PAN' && cleanId.length !== 10) {
      setError('PAN card number must contain exactly 10 alphanumeric characters (e.g. ABCDE1234F).');
      return;
    }

    setLoading(true);
    try {
      const status = await api.submitHostIdentity({
        legal_name: legalName.trim(),
        profile_photo_url: profilePhotoUrl,
        gov_id_type: govIdType,
        gov_id_number: cleanId,
        gov_id_document_url: govIdDocUrl || profilePhotoUrl,
      });

      setVerificationStatus(status);
      setSuccessMsg('✓ Host Identity Automatically Verified via DigiLocker / NSDL e-KYC Engine! You can now list parking spaces.');
    } catch (err: any) {
      setError(err.message || 'Automated KYC verification failed. Please check your document number.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center space-x-2 text-emerald-800 font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading KYC verification portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner Header */}
      <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center space-x-1.5 bg-emerald-800/60 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-700">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Automated Identity Provider (DigiLocker / UIDAI & NSDL e-KYC)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Host Identity & KYC Verification</h1>
          <p className="text-emerald-300 text-xs max-w-xl">
            Complete your automated e-KYC to activate your host account, build driver trust, and unlock parking space listings.
          </p>
        </div>

        {verificationStatus?.is_identity_verified ? (
          <div className="bg-emerald-800/80 border border-emerald-600 rounded-2xl px-5 py-3 text-center sm:text-right space-y-1">
            <span className="inline-flex items-center space-x-1 bg-emerald-500 text-slate-950 font-black text-xs px-3 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Identity Verified</span>
            </span>
            <p className="text-[11px] text-emerald-200">e-KYC Compliant</p>
          </div>
        ) : (
          <div className="bg-amber-900/60 border border-amber-700 rounded-2xl px-5 py-3 text-center sm:text-right space-y-1">
            <span className="inline-flex items-center space-x-1 bg-amber-400 text-amber-950 font-black text-xs px-3 py-0.5 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Pending Verification</span>
            </span>
            <p className="text-[11px] text-amber-200">5 Quick Steps Required</p>
          </div>
        )}
      </div>

      {/* Verified Congratulatory Card */}
      {verificationStatus?.is_identity_verified && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-black text-emerald-950">Host Verification Complete!</h2>
              <p className="text-xs text-emerald-800">
                Verified as <strong>{verificationStatus.legal_name}</strong> via {verificationStatus.id_verification_provider || 'Automated e-KYC'}. Space listing submission is fully unlocked.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/create-listing"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Parking Space Listing</span>
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Host Dashboard</span>
            </Link>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Verification Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-6">
        
        {/* Step 1: Legal Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
            1. Full Legal Name (As displayed on Government ID) *
          </label>
          <div className="relative">
            <UserIcon className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g. Rajesh Kumar Sharma"
              className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-gray-900"
            />
          </div>
        </div>

        {/* Step 2: Mobile Number + SMS OTP */}
        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Phone className="w-4 h-4 text-emerald-700" />
              <span>2. Mobile Phone Number & SMS OTP *</span>
            </label>
            {isPhoneVerified ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                Verification Required
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
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
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 disabled:opacity-50"
              >
                {sendingPhoneOtp ? 'Sending...' : isPhoneOtpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            )}
          </div>

          {isPhoneOtpSent && !isPhoneVerified && (
            <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in">
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
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {verifyingPhoneOtp ? 'Verifying...' : 'Verify OTP'}
              </button>
              <span className="text-[11px] text-emerald-700 font-medium">OTP auto-filled (or check background terminal)</span>
            </div>
          )}
        </div>

        {/* Step 3: Email Address + Email OTP */}
        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Mail className="w-4 h-4 text-emerald-700" />
              <span>3. Email Address & Email OTP *</span>
            </label>
            {isEmailVerified ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                Verification Required
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
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
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 disabled:opacity-50"
              >
                {sendingEmailOtp ? 'Sending...' : isEmailOtpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            )}
          </div>

          {isEmailOtpSent && !isEmailVerified && (
            <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in">
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
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {verifyingEmailOtp ? 'Verifying...' : 'Verify OTP'}
              </button>
              <span className="text-[11px] text-gray-500">Check email inbox (dispatched via Gmail SMTP)</span>
            </div>
          )}
        </div>

        {/* Step 4: Host Profile Photo */}
        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Camera className="w-4 h-4 text-emerald-700" />
              <span>4. Host Profile Photo (Live Camera or Upload) *</span>
            </label>
            {profilePhotoUrl ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Photo Ready</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                Required
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-gray-200/70 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setPhotoMode('upload');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${photoMode === 'upload' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Upload Photo
            </button>
            <button
              type="button"
              onClick={() => {
                setPhotoMode('camera');
                startCamera();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${photoMode === 'camera' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Live Camera
            </button>
          </div>

          {photoMode === 'upload' ? (
            <div className="flex items-center space-x-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleDevicePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white border border-gray-300 hover:border-emerald-500 rounded-xl text-xs font-bold text-gray-800 transition flex items-center space-x-1.5 shadow-sm"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>{isUploadingPhoto ? 'Uploading...' : 'Choose Photo from Device'}</span>
              </button>
              {profilePhotoUrl && (
                <div className="flex items-center space-x-2">
                  <img src={profilePhotoUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shadow-sm" />
                  <span className="text-xs text-emerald-800 font-semibold">✓ Photo attached</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative w-64 h-48 bg-slate-900 rounded-2xl overflow-hidden border-2 border-emerald-400 mx-auto shadow-md">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                {!isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-300">
                    Camera loading...
                  </div>
                )}
              </div>
              <div className="flex justify-center space-x-2">
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={captureLivePhoto}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isUploadingPhoto ? 'Saving Snapshot...' : 'Capture Selfie Frame'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 5: Government ID Document */}
        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>5. Government ID Verification (Automated e-KYC) *</span>
            </label>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Instant Check
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { type: 'AADHAAR', label: 'Aadhaar Card' },
              { type: 'PAN', label: 'PAN Card' },
              { type: 'DRIVING_LICENCE', label: 'Driving Licence' },
              { type: 'PASSPORT', label: 'Passport' }
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setGovIdType(item.type as any)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${govIdType === item.type ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-gray-600 uppercase">
              {govIdType} Document Number *
            </label>
            <input
              type="text"
              required
              value={govIdNumber}
              onChange={(e) => setGovIdNumber(e.target.value)}
              placeholder={
                govIdType === 'AADHAAR' ? 'e.g. 2345 6789 0123 (12 digits)' :
                govIdType === 'PAN' ? 'e.g. ABCDE1234F (10 characters)' :
                govIdType === 'DRIVING_LICENCE' ? 'e.g. DL1420110012345' : 'e.g. A1234567'
              }
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono tracking-wider uppercase text-gray-900"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-gray-600 uppercase">
              Upload ID Proof Document (JPG, PNG, or PDF)
            </label>
            <div className="flex items-center space-x-3">
              <input
                ref={docFileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleDocUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploadingDoc}
                onClick={() => docFileInputRef.current?.click()}
                className="px-4 py-2 bg-white border border-gray-300 hover:border-emerald-500 rounded-xl text-xs font-bold text-gray-800 transition flex items-center space-x-1.5 shadow-sm"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>{isUploadingDoc ? 'Uploading Document...' : `Upload ${govIdType} Proof`}</span>
              </button>
              {govIdDocUrl && (
                <span className="text-xs text-emerald-700 font-semibold">✓ Document proof attached</span>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-lg transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <ShieldCheck className="w-5 h-5" />
          <span>{loading ? 'Processing Automated e-KYC Verification...' : 'Complete Automated e-KYC & Unlock Listings'}</span>
        </button>

      </form>
    </div>
  );
};
export default HostVerificationPage;
