import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { VerificationStatus } from '../types';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  User as UserIcon, 
  FileText, 
  Camera, 
  Upload, 
  RefreshCw, 
  X, 
  ArrowRight, 
  Sparkles,
  Check,
  CreditCard
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (status: VerificationStatus) => void;
  initialPhone?: string;
  initialEmail?: string;
  initialName?: string;
}

export const HostIdentityVerificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPhone = '',
  initialEmail = '',
  initialName = '',
}) => {
  const [legalName, setLegalName] = useState(initialName);
  
  // Mobile Verification State
  const [phone, setPhone] = useState(initialPhone);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);

  // Email Verification State
  const [email, setEmail] = useState(initialEmail);
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

  useEffect(() => {
    if (isOpen) {
      api.getVerificationStatus().then((status) => {
        if (status.legal_name) setLegalName(status.legal_name);
        if (status.phone_number) setPhone(status.phone_number);
        if (status.phone_verified) setIsPhoneVerified(true);
        if (status.email) setEmail(status.email);
        if (status.email_verified) setIsEmailVerified(true);
        if (status.profile_photo_url) setProfilePhotoUrl(status.profile_photo_url);
        if (status.gov_id_type) setGovIdType(status.gov_id_type as any);
        if (status.gov_id_number) setGovIdNumber(status.gov_id_number);
        if (status.gov_id_document_url) setGovIdDocUrl(status.gov_id_document_url);
      }).catch(console.error);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Mobile OTP Handlers
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number with country code (e.g. +91 9876543210)');
      return;
    }
    setError('');
    setSendingPhoneOtp(true);
    try {
      const res = await api.sendMobileOtp(phone.trim());
      setIsPhoneOtpSent(true);
      if (res.sms_delivered) {
        setSuccessMsg(`✓ 6-digit verification code has been dispatched via real SMS to ${phone}. Please check your phone SMS.`);
        setPhoneOtp('');
      } else if (res.dev_otp) {
        setPhoneOtp(res.dev_otp);
        setSuccessMsg(`✓ Verification code: ${res.dev_otp} (Auto-filled)`);
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
      setError(err.message || 'Invalid Mobile OTP. Please check the code received on your phone.');
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
        setSuccessMsg(`✓ 6-digit verification code has been dispatched via email to ${email}. Please check your inbox or spam.`);
      } else {
        setSuccessMsg(res.message);
      }
      setEmailOtp('');
    } catch (err: any) {
      setError(err.message || 'Failed to send Email OTP. Please check the email address.');
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
      setSuccessMsg('✓ Email address successfully verified via Email OTP!');
    } catch (err: any) {
      setError(err.message || 'Invalid Email OTP. Please check the code sent to your email.');
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
      if (!ctx) throw new Error('Failed to create photo canvas');

      // Mirror live camera capture
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
          const uploadRes = await api.uploadFile(blob, 'live_host_photo.jpg');
          setProfilePhotoUrl(uploadRes.url);
          stopCamera();
          setSuccessMsg('✓ Live face photo captured and verified successfully!');
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

      setSuccessMsg('✓ Host Identity Automatically Verified via DigiLocker / NSDL e-KYC Engine! You can now list parking spaces.');
      setTimeout(() => {
        onSuccess(status);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Automated KYC verification failed. Please check your document number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-emerald-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-6 relative">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Host Identity Verification</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Automated e-KYC Verification required before listing private parking spaces
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl flex items-center space-x-2.5 font-medium shadow-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl flex items-center space-x-2.5 font-medium shadow-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Full Legal Name */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  <span>1. Full Legal Name (As on Government ID) *</span>
                </label>
                {legalName.length > 2 && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Entered</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Rajesh Kumar Sharma"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-500">Must exactly match the name on your Aadhaar, PAN, Passport, or Driving Licence.</p>
            </div>

            {/* 2. Mobile Number + Real OTP Verification */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>2. Mobile Number + SMS OTP Verification *</span>
                </label>
                {isPhoneVerified ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✓ OTP Verified</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Verification Required
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="tel"
                  disabled={isPhoneVerified}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-600"
                />
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
                <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                  <input
                    type="text"
                    maxLength={6}
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-44 px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"
                  />
                  <button
                    type="button"
                    disabled={verifyingPhoneOtp || phoneOtp.length !== 6}
                    onClick={handleVerifyPhoneOtp}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {verifyingPhoneOtp ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <span className="text-[11px] text-gray-500">Check phone SMS</span>
                </div>
              )}
            </div>

            {/* 3. Email Address + Real OTP Verification */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>3. Email Address + Email OTP Verification *</span>
                </label>
                {isEmailVerified ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✓ Email Verified</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Verification Required
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  disabled={isEmailVerified}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="host@example.com"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-600"
                />
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
                <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-44 px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"
                  />
                  <button
                    type="button"
                    disabled={verifyingEmailOtp || emailOtp.length !== 6}
                    onClick={handleVerifyEmailOtp}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {verifyingEmailOtp ? 'Verifying...' : 'Verify Email'}
                  </button>
                  <span className="text-[11px] text-gray-500">Check inbox / spam</span>
                </div>
              )}
            </div>

            {/* 4. Host Profile Photo: Live Camera OR Upload from Device */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>4. Host Profile Photo (Live Camera or Upload) *</span>
                </label>
                {profilePhotoUrl ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Photo Ready</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Required
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
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleDevicePhotoUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Click to browse and upload photo from device</p>
                      <p className="text-[11px] text-gray-500">Supports JPG, PNG, or WebP (max 10MB)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Camera View */}
              {photoMode === 'camera' && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-emerald-500/50 shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white p-4 space-y-2">
                        <Camera className="w-8 h-8 text-emerald-400" />
                        <p className="text-xs font-medium">Camera is inactive</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
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
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{isUploadingPhoto ? 'Uploading Frame...' : 'Snap & Save Live Photo'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Photo Preview */}
              {profilePhotoUrl && (
                <div className="flex items-center space-x-3 bg-white p-2.5 rounded-xl border border-gray-200">
                  <img
                    src={profilePhotoUrl}
                    alt="Active Profile"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">Host Profile Photo Attached</p>
                    <p className="text-[11px] text-emerald-600 font-medium">Verified for identity match</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfilePhotoUrl('')}
                    className="p-1.5 text-gray-400 hover:text-rose-600 transition"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 5. Government ID Verification & Automated KYC Provider */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3.5">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>5. Government ID Verification (Automated e-KYC) *</span>
              </label>

              {/* ID Type Options: Aadhaar, PAN, DL, Passport */}
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
                    onClick={() => {
                      setGovIdType(item.id as any);
                      setError('');
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition ${
                      govIdType === item.id
                        ? 'bg-emerald-100 border-emerald-600 text-emerald-950 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-center">{item.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  {govIdType === 'AADHAAR' 
                    ? '12-Digit Aadhaar Number (UIDAI Checksum Validated)' 
                    : govIdType === 'PAN'
                    ? '10-Character PAN Card Number (e.g. ABCDE1234F)'
                    : govIdType === 'DRIVING_LICENCE' 
                    ? 'Driving Licence Number' 
                    : 'Passport Number'}
                </label>
                <input
                  type="text"
                  required
                  value={govIdNumber}
                  onChange={(e) => setGovIdNumber(e.target.value.toUpperCase())}
                  placeholder={
                    govIdType === 'AADHAAR'
                      ? '5482 1928 3041'
                      : govIdType === 'PAN'
                      ? 'ABCDE1234F'
                      : govIdType === 'DRIVING_LICENCE'
                      ? 'KA01 20210012345'
                      : 'Z1234567'
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono tracking-wider focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Upload Document Scan/Photo from Device */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-700">Upload {govIdType} Document Scan (Optional / Supporting):</span>
                  {govIdDocUrl && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Document Attached
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={docFileInputRef}
                  accept="image/*,application/pdf"
                  onChange={handleDocUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => docFileInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="w-full py-2 px-3 border border-gray-300 bg-white hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 transition flex items-center justify-center space-x-2"
                >
                  <Upload className="w-3.5 h-3.5 text-gray-500" />
                  <span>{isUploadingDoc ? 'Uploading...' : govIdDocUrl ? 'Replace Uploaded Document' : `Upload ${govIdType} Document Scan`}</span>
                </button>
              </div>

              {/* Automated KYC Provider Guarantee Banner */}
              <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-900">Automated e-KYC Verification Provider Integration</p>
                  <p className="text-gray-600 leading-relaxed">
                    Documents are verified automatically in real-time via DigiLocker, UIDAI & NSDL APIs. 
                    Platform admins do not manually inspect your ID; verification and instant space approval occur automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? 'Processing Automated e-KYC Verification...' : 'Complete Automated e-KYC & Unlock Listing'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
