import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, getFullImageUrl } from '../services/api';
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
  ArrowLeft,
  Sparkles, 
  Check, 
  CreditCard, 
  RefreshCw, 
  PlusCircle, 
  LayoutDashboard,
  Lock,
  BadgeCheck,
  FileText,
  RotateCcw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import { useAuth } from '../context/AuthContext';
import { compressImageToDataUrl } from '../utils/imageCompressor';

export const HostVerificationPage: React.FC = () => {
  const { updateUser } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Stepper state: 1 = Basic Info, 2 = Photo ID, 3 = Government ID
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showEditMode, setShowEditMode] = useState(false);

  // Form states
  const [legalName, setLegalName] = useState('');
  
  // Mobile Verification State
  const [phone, setPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);
  const [phoneDevOtp, setPhoneDevOtp] = useState<string | null>(null);

  // Email Verification State
  const [email, setEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [emailDevOtp, setEmailDevOtp] = useState<string | null>(null);

  // Profile Photo State
  const [photoMode, setPhotoMode] = useState<'upload' | 'camera'>('upload');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Government ID State
  const [govIdType, setGovIdType] = useState<'AADHAAR' | 'PAN' | 'DRIVING_LICENCE' | 'PASSPORT'>('AADHAAR');
  const [govIdNumber, setGovIdNumber] = useState('');
  const [govIdDocUrl, setGovIdDocUrl] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Format ID numbers
  const formatGovIdInput = (value: string, type: 'AADHAAR' | 'PAN' | 'DRIVING_LICENCE' | 'PASSPORT'): string => {
    if (type === 'AADHAAR') {
      const digits = value.replace(/\D/g, '').slice(0, 12);
      const groups = digits.match(/.{1,4}/g);
      return groups ? groups.join(' ') : '';
    }
    if (type === 'PAN') {
      return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
    }
    if (type === 'DRIVING_LICENCE') {
      return value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 16).toUpperCase();
    }
    if (type === 'PASSPORT') {
      return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 9).toUpperCase();
    }
    return value.toUpperCase();
  };

  // Stop camera stream
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

  // Mobile OTP Handlers
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setSendingPhoneOtp(true);
    try {
      const res = await api.sendMobileOtp(phone.trim());
      setIsPhoneOtpSent(true);
      if (res.dev_otp) {
        setPhoneDevOtp(res.dev_otp);
        setPhoneOtp(res.dev_otp);
        setSuccessMsg(`✓ Verification code ready! Auto-filled: ${res.dev_otp}`);
      } else if (res.sms_delivered) {
        setSuccessMsg(`✓ Verification code sent via SMS to ${phone}`);
        setPhoneOtp('');
      } else {
        setSuccessMsg(res.message);
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
      setSuccessMsg('✓ Mobile number verified successfully!');
    } catch (err: any) {
      setError(err.message || 'Invalid Mobile OTP. Please try again.');
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
      if (res.dev_otp) {
        setEmailDevOtp(res.dev_otp);
        setEmailOtp(res.dev_otp);
        setSuccessMsg(`✓ Verification code ready! Auto-filled: ${res.dev_otp}`);
      } else if (res.email_delivered) {
        setSuccessMsg(`✓ Verification code sent to ${email}`);
        setEmailOtp('');
      } else {
        setSuccessMsg(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send Email verification code');
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
      setSuccessMsg('✓ Email address verified successfully!');
    } catch (err: any) {
      setError(err.message || 'Invalid Email OTP. Please try again.');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // Camera Handlers
  const startCamera = async () => {
    setError('');
    if (!navigator?.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Live camera requires HTTPS or localhost. Please use the device photo upload below.');
      return;
    }
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
      setError('Camera access unavailable. You can upload a photo from your device instead.');
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
      if (!ctx) throw new Error('Failed to capture frame');

      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Failed to capture frame');
          setIsUploadingPhoto(false);
          return;
        }

        const compressedDataUrl = await compressImageToDataUrl(blob, 260, 0.88);
        if (compressedDataUrl) {
          try {
            localStorage.setItem('parkshare_host_avatar', compressedDataUrl);
          } catch {}
          setProfilePhotoUrl(compressedDataUrl);
          updateUser({ profile_photo_url: compressedDataUrl });
        }

        stopCamera();
        setSuccessMsg('✓ Selfie photo captured successfully!');

        try {
          const res = await api.uploadFile(blob, 'host_live_photo.jpg');
          if (res?.url) {
            setProfilePhotoUrl(res.url);
            api.updateProfilePhoto(res.url).catch(() => {});
          }
        } catch {
          if (compressedDataUrl) {
            api.updateProfilePhoto(compressedDataUrl).catch(() => {});
          }
        } finally {
          setIsUploadingPhoto(false);
        }
      }, 'image/jpeg', 0.9);
    } catch (err: any) {
      setError(err.message || 'Failed to capture photo');
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

    const compressedDataUrl = await compressImageToDataUrl(file, 260, 0.88);
    if (compressedDataUrl) {
      try {
        localStorage.setItem('parkshare_host_avatar', compressedDataUrl);
      } catch {}
      setProfilePhotoUrl(compressedDataUrl);
      updateUser({ profile_photo_url: compressedDataUrl });
    }

    setSuccessMsg('✓ Profile photo uploaded successfully!');

    try {
      const res = await api.uploadFile(file, file.name);
      if (res?.url) {
        setProfilePhotoUrl(res.url);
        api.updateProfilePhoto(res.url).catch(() => {});
      }
    } catch {
      if (compressedDataUrl) {
        api.updateProfilePhoto(compressedDataUrl).catch(() => {});
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsUploadingDoc(true);
    try {
      const res = await api.uploadFile(file, file.name);
      setGovIdDocUrl(res.url);
      setSuccessMsg(`✓ ${govIdType} document uploaded for automated verification!`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Step 1 Validation
  const canProceedStep1 = legalName.trim().length >= 2 && isPhoneVerified && isEmailVerified;

  // Step 2 Validation
  const canProceedStep2 = Boolean(profilePhotoUrl);

  // Submit Final Identity
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!legalName || legalName.trim().length < 2) {
      setError('Full legal name is mandatory and must match your Government ID.');
      setCurrentStep(1);
      return;
    }
    if (!isPhoneVerified) {
      setError('Please verify your mobile number with OTP.');
      setCurrentStep(1);
      return;
    }
    if (!isEmailVerified) {
      setError('Please verify your email address with OTP.');
      setCurrentStep(1);
      return;
    }
    if (!profilePhotoUrl) {
      setError('Please provide a profile photo or selfie.');
      setCurrentStep(2);
      return;
    }
    if (!govIdNumber || govIdNumber.trim().length < 4) {
      setError(`Please enter your valid ${govIdType} document number.`);
      return;
    }

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
      if (status.profile_photo_url) {
        try {
          localStorage.setItem('parkshare_host_avatar', status.profile_photo_url);
        } catch {}
      }
      updateUser({
        profile_photo_url: status.profile_photo_url || profilePhotoUrl,
        full_name: status.legal_name || legalName.trim(),
      });
      setSuccessMsg('🎉 Host Identity Successfully Verified via DigiLocker / NSDL Automated Engine!');
      setShowEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Automated KYC verification failed. Please check your document number.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 text-emerald-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center animate-spin">
            <RefreshCw className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="text-sm font-semibold tracking-wide">Loading Verification Portal...</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 1. ALREADY VERIFIED: Digital Host ID Card View
  // ----------------------------------------------------
  if (verificationStatus?.is_identity_verified && !showEditMode) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Verification Success Toast */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Digital Host Credential Pass */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-950 text-white p-7 sm:p-10 shadow-2xl border border-emerald-500/30">
          {/* Subtle decorative glow */}
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-800/60 pb-6">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">ParkShare Official</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                    e-KYC PASSED
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Verified Host Credential</h1>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 px-3.5 py-1.5 rounded-full border border-emerald-400/40 text-xs font-bold shadow-sm">
              <BadgeCheck className="w-4 h-4 text-emerald-400" />
              <span>Full Hosting Privileges Active</span>
            </div>
          </div>

          {/* Card Body: Profile & Verification Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 items-center">
            {/* Host Avatar & Name */}
            <div className="sm:col-span-2 flex items-center space-x-5">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-md bg-emerald-900/50 flex items-center justify-center">
                  {(profilePhotoUrl || verificationStatus.profile_photo_url) ? (
                    <img 
                      src={profilePhotoUrl || getFullImageUrl(verificationStatus.profile_photo_url)} 
                      alt="Verified Host" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        // Fallback gracefully to icon if image url is inaccessible
                        (e.target as HTMLElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          const initialDiv = document.createElement('div');
                          initialDiv.className = 'w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-700 to-teal-500 text-white font-black text-2xl';
                          initialDiv.innerText = (verificationStatus.legal_name || 'V')[0].toUpperCase();
                          parent.appendChild(initialDiv);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-700 to-teal-500 text-white font-black text-2xl">
                      {(verificationStatus.legal_name || 'V')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-slate-950 p-1 rounded-full shadow-md">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider">Host Legal Identity</p>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {verificationStatus.legal_name || 'Verified Parking Host'}
                </h2>
                <div className="flex flex-col gap-0.5 text-xs text-emerald-200/80">
                  <span>📱 {verificationStatus.phone_number || phone || 'Verified Mobile'}</span>
                  <span>✉️ {verificationStatus.email || email || 'Verified Email'}</span>
                </div>
              </div>
            </div>

            {/* QR Stamp & Verified Details */}
            <div className="flex flex-col items-center sm:items-end justify-center sm:border-l sm:border-emerald-800/60 sm:pl-6 space-y-2">
              <div className="p-2 bg-white rounded-xl shadow-lg border border-emerald-400/40">
                <QRCodeSVG 
                  value={`PARKSHARE:KYC:VERIFIED:${verificationStatus.legal_name || 'HOST'}:${verificationStatus.gov_id_type || 'AADHAAR'}`} 
                  size={76} 
                />
              </div>
              <div className="text-center sm:text-right text-[11px] text-emerald-300/80 space-y-0.5">
                <p className="font-semibold text-white">Provider: {verificationStatus.id_verification_provider || 'DigiLocker / UIDAI'}</p>
                <p>Status: <span className="text-emerald-400 font-bold">100% Verified</span></p>
              </div>
            </div>
          </div>

          {/* Quick Perks / Trust Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-emerald-800/60">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                ⚡
              </div>
              <div>
                <p className="text-xs font-bold text-white">Instant Space Go-Live</p>
                <p className="text-[10px] text-emerald-300/80">Listings published without wait</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300 font-bold">
                🛡️
              </div>
              <div>
                <p className="text-xs font-bold text-white">Verified Trust Badge</p>
                <p className="text-[10px] text-emerald-300/80">Builds immediate driver trust</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 font-bold">
                💳
              </div>
              <div>
                <p className="text-xs font-bold text-white">Direct Automated Payouts</p>
                <p className="text-[10px] text-emerald-300/80">Automatic bank transfers enabled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Link
              to="/create-listing"
              className="flex-1 sm:flex-none px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span>List a Parking Space Now</span>
            </Link>

            <Link
              to="/dashboard"
              className="flex-1 sm:flex-none px-5 py-3.5 bg-white hover:bg-emerald-50 text-gray-800 border border-gray-200 hover:border-emerald-300 rounded-2xl font-bold text-sm shadow-sm transition flex items-center justify-center space-x-2"
            >
              <LayoutDashboard className="w-5 h-5 text-emerald-600" />
              <span>Host Dashboard</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setShowEditMode(true)}
            className="text-xs text-gray-500 hover:text-emerald-700 font-semibold flex items-center space-x-1.5 transition underline decoration-dotted underline-offset-4"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Update / Re-verify KYC Details</span>
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. IN-PROGRESS / NEW: 3-Step Simple & Attractive KYC Flow
  // ----------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-400/30">
              <Lock className="w-3 h-3" />
              <span>DigiLocker & UIDAI Integrated • 256-Bit SSL</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Identity Verification (e-KYC)</h1>
            <p className="text-xs text-emerald-200/80">
              Simple 3-step verification to publish parking spaces and unlock driver trust.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 w-fit">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <span className="text-xs font-bold text-white">Step {currentStep} of 3</span>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="mt-6 pt-5 border-t border-emerald-800/70">
          <div className="grid grid-cols-3 gap-2">
            {[
              { step: 1, title: 'Contact & Name', icon: UserIcon, done: canProceedStep1 },
              { step: 2, title: 'Photo ID / Selfie', icon: Camera, done: canProceedStep2 },
              { step: 3, title: 'Government ID', icon: CreditCard, done: false },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = currentStep === s.step;
              const isDone = s.done;

              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    // Allow clicking back to step 1 anytime, or step 2 if step 1 is done
                    if (s.step === 1) setCurrentStep(1);
                    if (s.step === 2 && canProceedStep1) setCurrentStep(2);
                    if (s.step === 3 && canProceedStep1 && canProceedStep2) setCurrentStep(3);
                  }}
                  className={`flex items-center space-x-2 p-2 rounded-xl transition text-left ${
                    isActive 
                      ? 'bg-emerald-500/30 border border-emerald-400 text-white' 
                      : isDone 
                      ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/40' 
                      : 'opacity-40 text-gray-300'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isDone ? 'bg-emerald-500 text-slate-950' : isActive ? 'bg-white text-emerald-950' : 'bg-emerald-900 text-white'
                  }`}>
                    {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : s.step}
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <p className="text-[11px] font-bold truncate leading-tight">{s.title}</p>
                    <p className="text-[9px] text-emerald-200/70">
                      {isDone ? 'Completed' : isActive ? 'In Progress' : 'Pending'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Step Content Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-6">
        
        {/* ========================================================== */}
        {/* STEP 1: Basic Info & Contact Verification */}
        {/* ========================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-black text-gray-900">Step 1: Contact Details & Legal Name</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Verify your name, mobile, and email to secure your host account.
              </p>
            </div>

            {/* 1. Full Legal Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Full Legal Name (as on Government ID) *
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar Sharma"
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none text-sm font-medium text-gray-900 transition"
                />
              </div>
            </div>

            {/* 2. Mobile Phone Number & SMS OTP */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Phone className="w-4 h-4 text-emerald-700" />
                  <span>Mobile Number Verification *</span>
                </label>
                {isPhoneVerified ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Required
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">+91</span>
                  <input
                    type="tel"
                    required
                    disabled={isPhoneVerified}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-gray-900 disabled:bg-gray-100"
                  />
                </div>
                {!isPhoneVerified && (
                  <button
                    type="button"
                    disabled={sendingPhoneOtp}
                    onClick={handleSendPhoneOtp}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 disabled:opacity-50 shadow-sm"
                  >
                    {sendingPhoneOtp ? 'Sending...' : isPhoneOtpSent ? 'Resend' : 'Send OTP'}
                  </button>
                )}
              </div>

              {/* OTP Entry */}
              {isPhoneOtpSent && !isPhoneVerified && (
                <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900">Enter 6-digit Mobile OTP</span>
                    {phoneDevOtp && (
                      <button
                        type="button"
                        onClick={() => setPhoneOtp(phoneDevOtp)}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-bold"
                      >
                        Auto-fill ({phoneDevOtp})
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-36 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={verifyingPhoneOtp || phoneOtp.length !== 6}
                      onClick={handleVerifyPhoneOtp}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {verifyingPhoneOtp ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Email Address & OTP */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Mail className="w-4 h-4 text-emerald-700" />
                  <span>Email Address Verification *</span>
                </label>
                {isEmailVerified ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Required
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="email"
                    required
                    disabled={isEmailVerified}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="host@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-gray-900 disabled:bg-gray-100"
                  />
                </div>
                {!isEmailVerified && (
                  <button
                    type="button"
                    disabled={sendingEmailOtp}
                    onClick={handleSendEmailOtp}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 disabled:opacity-50 shadow-sm"
                  >
                    {sendingEmailOtp ? 'Sending...' : isEmailOtpSent ? 'Resend' : 'Send Code'}
                  </button>
                )}
              </div>

              {/* Email OTP Entry */}
              {isEmailOtpSent && !isEmailVerified && (
                <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900">Enter 6-digit Email Code</span>
                    {emailDevOtp && (
                      <button
                        type="button"
                        onClick={() => setEmailOtp(emailDevOtp)}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-bold"
                      >
                        Auto-fill ({emailDevOtp})
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-36 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={verifyingEmailOtp || emailOtp.length !== 6}
                      onClick={handleVerifyEmailOtp}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {verifyingEmailOtp ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 1 Continue CTA */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!canProceedStep1}
                onClick={() => setCurrentStep(2)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2 text-sm disabled:opacity-40"
              >
                <span>Continue to Photo Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {!canProceedStep1 && (
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  Please provide legal name and verify both Mobile & Email to continue.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 2: Profile Photo (Selfie or Upload) */}
        {/* ========================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-black text-gray-900">Step 2: Host Profile Photo / Selfie</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Take a quick live selfie or upload a photo to verify host identity.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex p-1 bg-gray-100 rounded-2xl w-fit mx-auto">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setPhotoMode('upload');
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                  photoMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Upload from Device
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhotoMode('camera');
                  startCamera();
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                  photoMode === 'camera' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Live Camera Selfie
              </button>
            </div>

            {/* Mode 1: Device Upload */}
            {photoMode === 'upload' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDevicePhotoUpload}
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-3xl p-6 text-center cursor-pointer transition hover:bg-emerald-50/30 flex flex-col items-center justify-center space-y-3"
                >
                  {profilePhotoUrl ? (
                    <div className="relative">
                      <img 
                        src={profilePhotoUrl} 
                        alt="Host Preview" 
                        className="w-28 h-28 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Upload className="w-7 h-7" />
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-800">
                      {profilePhotoUrl ? 'Click to Change Photo' : 'Click to Upload Profile Photo'}
                    </p>
                    <p className="text-[11px] text-gray-400">Supports JPG, PNG, WebP up to 10MB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Live Camera View */}
            {photoMode === 'camera' && (
              <div className="space-y-4 text-center">
                <div className="relative w-64 h-56 bg-slate-900 rounded-3xl overflow-hidden border-2 border-emerald-400/80 mx-auto shadow-lg">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]" 
                  />
                  
                  {/* Subtle face outline guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-40 border-2 border-dashed border-white/40 rounded-full" />
                  </div>

                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-300">
                      Accessing device camera...
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={isUploadingPhoto || !isCameraActive}
                    onClick={captureLivePhoto}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isUploadingPhoto ? 'Capturing...' : 'Capture Selfie Snapshot'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Photo Guidelines */}
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 flex items-center justify-around text-[11px] text-emerald-900 font-medium">
              <span className="flex items-center space-x-1">
                <span>💡</span>
                <span>Good Lighting</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>👤</span>
                <span>Face Centered</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>👓</span>
                <span>No Sunglasses</span>
              </span>
            </div>

            {/* Step 2 Navigation CTA */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setCurrentStep(1);
                }}
                className="px-5 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-2xl text-xs transition flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!canProceedStep2}
                onClick={() => {
                  stopCamera();
                  setCurrentStep(3);
                }}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2 text-sm disabled:opacity-40"
              >
                <span>Continue to Government ID</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 3: Government ID Verification */}
        {/* ========================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-black text-gray-900">Step 3: Government ID & Instant e-KYC</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Select your document type and enter your ID number for automated DigiLocker check.
              </p>
            </div>

            {/* Document Selector Pills */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select Identification Document Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { type: 'AADHAAR', label: 'Aadhaar Card', icon: '🪪' },
                  { type: 'PAN', label: 'PAN Card', icon: '💳' },
                  { type: 'DRIVING_LICENCE', label: 'Driving Licence', icon: '🚗' },
                  { type: 'PASSPORT', label: 'Passport', icon: '✈️' },
                ].map((item) => {
                  const isSelected = govIdType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setGovIdType(item.type as any)}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center space-y-1 ${
                        isSelected 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black shadow-sm ring-1 ring-emerald-500' 
                          : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Document Number Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {govIdType} Document Number *
                </label>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                  Instant Match
                </span>
              </div>
              <input
                type={govIdType === 'AADHAAR' ? 'tel' : 'text'}
                inputMode={govIdType === 'AADHAAR' ? 'numeric' : 'text'}
                required
                value={govIdNumber}
                onChange={(e) => setGovIdNumber(formatGovIdInput(e.target.value, govIdType))}
                placeholder={
                  govIdType === 'AADHAAR' ? 'e.g. 2345 6789 0123' :
                  govIdType === 'PAN' ? 'e.g. ABCDE1234F' :
                  govIdType === 'DRIVING_LICENCE' ? 'e.g. DL1420110012345' : 'e.g. A1234567'
                }
                maxLength={govIdType === 'AADHAAR' ? 14 : govIdType === 'PAN' ? 10 : 16}
                className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none text-base font-mono tracking-wider uppercase text-gray-900 transition"
              />
            </div>

            {/* Optional Document Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Upload Document Proof (Optional)
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
                  className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>{isUploadingDoc ? 'Uploading...' : govIdDocUrl ? 'Replace Document' : `Upload ${govIdType} PDF/Image`}</span>
                </button>
                {govIdDocUrl && (
                  <span className="text-xs text-emerald-700 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Attached</span>
                  </span>
                )}
              </div>
            </div>

            {/* Trust and Provider Reassurance */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-xs text-emerald-950">
                <p className="font-bold">Automated Instant Verification</p>
                <p className="text-emerald-800 text-[11px]">
                  Your credentials are cross-referenced with official e-KYC databases. Verification takes seconds.
                </p>
              </div>
            </div>

            {/* Step 3 Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-2xl text-xs transition flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading || !govIdNumber}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/25 transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying with DigiLocker Engine...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Complete e-KYC & Unlock Listings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </form>

      {/* Safety & Compliance Footnote */}
      <div className="text-center text-[11px] text-gray-400 space-y-1">
        <p>🔒 Compliant with UIDAI and RBI identity verification guidelines.</p>
        <p>Your personal data is encrypted and securely processed for parking host verification only.</p>
      </div>

    </div>
  );
};

export default HostVerificationPage;
