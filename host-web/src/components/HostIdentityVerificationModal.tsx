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
  Camera, 
  Upload, 
  ArrowRight, 
  ArrowLeft,
  Sparkles, 
  Check, 
  CreditCard, 
  RefreshCw, 
  X,
  Lock,
  FileText
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { compressImageToDataUrl } from '../utils/imageCompressor';

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
  const { updateUser } = useAuth();
  
  // Stepper state: 1 = Basic Info, 2 = Photo ID, 3 = Government ID
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [legalName, setLegalName] = useState(initialName);
  
  // Mobile Verification State
  const [phone, setPhone] = useState(initialPhone);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);
  const [phoneDevOtp, setPhoneDevOtp] = useState<string | null>(null);

  // Email Verification State
  const [email, setEmail] = useState(initialEmail);
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
        setSuccessMsg(`✓ Verification code dispatched via SMS to ${phone}`);
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
      if (res.dev_otp) {
        setEmailDevOtp(res.dev_otp);
        setEmailOtp(res.dev_otp);
        setSuccessMsg(`✓ Verification code ready! Auto-filled: ${res.dev_otp}`);
      } else if (res.email_delivered) {
        setSuccessMsg(`✓ Verification code dispatched to ${email}`);
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
      setError(err.message || 'Invalid Email OTP');
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

        const compressedDataUrl = await compressImageToDataUrl(blob, 240, 0.85);
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

    const compressedDataUrl = await compressImageToDataUrl(file, 240, 0.85);
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

  const canProceedStep1 = legalName.trim().length >= 2 && isPhoneVerified && isEmailVerified;
  const canProceedStep2 = Boolean(profilePhotoUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!legalName || legalName.trim().length < 2) {
      setError('Full legal name is mandatory and must match your ID.');
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
      setError('A profile photo or live selfie is mandatory.');
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

      setSuccessMsg('✓ Host Identity Automatically Verified via DigiLocker / NSDL Engine!');
      if (status.profile_photo_url) {
        try {
          localStorage.setItem('parkshare_host_avatar', status.profile_photo_url);
        } catch {}
      }
      updateUser({
        profile_photo_url: status.profile_photo_url || profilePhotoUrl,
        full_name: status.legal_name || legalName.trim(),
      });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-emerald-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 text-white p-6 relative">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">e-KYC Verification</span>
                <span className="text-[10px] bg-white/10 text-emerald-200 px-2 py-0.5 rounded-full">Step {currentStep} of 3</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">Host Identity Verification</h2>
            </div>
          </div>

          {/* Stepper Bar in Modal */}
          <div className="mt-4 pt-4 border-t border-emerald-800/60 grid grid-cols-3 gap-2">
            {[
              { step: 1, title: 'Basic Info', done: canProceedStep1 },
              { step: 2, title: 'Photo ID', done: canProceedStep2 },
              { step: 3, title: 'Govt ID', done: false },
            ].map((s) => (
              <div
                key={s.step}
                className={`flex items-center space-x-2 p-1.5 rounded-xl text-left ${
                  currentStep === s.step
                    ? 'bg-emerald-500/20 border border-emerald-400/40 text-white'
                    : s.done
                    ? 'text-emerald-300'
                    : 'opacity-40 text-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                  s.done ? 'bg-emerald-500 text-slate-950' : currentStep === s.step ? 'bg-white text-emerald-950' : 'bg-emerald-900 text-white'
                }`}>
                  {s.done ? <Check className="w-3 h-3 stroke-[3]" /> : s.step}
                </div>
                <span className="text-[11px] font-bold truncate">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl flex items-center space-x-2.5 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl flex items-center space-x-2.5 font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* STEP 1: Personal & Contact */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in">
                {/* Legal Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Full Legal Name (as on ID) *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="Rajesh Kumar"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm"
                    />
                  </div>
                </div>

                {/* Mobile Phone Verification */}
                <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mobile Number Verification *</span>
                    </label>
                    {isPhoneVerified && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      required
                      disabled={isPhoneVerified}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs disabled:bg-gray-100"
                    />
                    {!isPhoneVerified && (
                      <button
                        type="button"
                        disabled={sendingPhoneOtp}
                        onClick={handleSendPhoneOtp}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 disabled:opacity-50"
                      >
                        {sendingPhoneOtp ? '...' : isPhoneOtpSent ? 'Resend' : 'Send OTP'}
                      </button>
                    )}
                  </div>
                  {isPhoneOtpSent && !isPhoneVerified && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        maxLength={6}
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="6-digit OTP"
                        className="w-28 px-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono tracking-widest text-center"
                      />
                      <button
                        type="button"
                        disabled={verifyingPhoneOtp || phoneOtp.length !== 6}
                        onClick={handleVerifyPhoneOtp}
                        className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        {verifyingPhoneOtp ? '...' : 'Verify'}
                      </button>
                      {phoneDevOtp && (
                        <button
                          type="button"
                          onClick={() => setPhoneOtp(phoneDevOtp)}
                          className="text-[10px] text-emerald-700 underline font-bold"
                        >
                          Auto-fill
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Email Verification */}
                <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Email Verification *</span>
                    </label>
                    {isEmailVerified && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      disabled={isEmailVerified}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="host@example.com"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs disabled:bg-gray-100"
                    />
                    {!isEmailVerified && (
                      <button
                        type="button"
                        disabled={sendingEmailOtp}
                        onClick={handleSendEmailOtp}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 disabled:opacity-50"
                      >
                        {sendingEmailOtp ? '...' : isEmailOtpSent ? 'Resend' : 'Send Code'}
                      </button>
                    )}
                  </div>
                  {isEmailOtpSent && !isEmailVerified && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="6-digit code"
                        className="w-28 px-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono tracking-widest text-center"
                      />
                      <button
                        type="button"
                        disabled={verifyingEmailOtp || emailOtp.length !== 6}
                        onClick={handleVerifyEmailOtp}
                        className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        {verifyingEmailOtp ? '...' : 'Verify'}
                      </button>
                      {emailDevOtp && (
                        <button
                          type="button"
                          onClick={() => setEmailOtp(emailDevOtp)}
                          className="text-[10px] text-emerald-700 underline font-bold"
                        >
                          Auto-fill
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 1 Next */}
                <button
                  type="button"
                  disabled={!canProceedStep1}
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-2 disabled:opacity-40"
                >
                  <span>Continue to Photo Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: Photo Verification */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex p-1 bg-gray-100 rounded-xl w-fit mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setPhotoMode('upload');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      photoMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMode('camera');
                      startCamera();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      photoMode === 'camera' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Take Live Selfie
                  </button>
                </div>

                {photoMode === 'upload' ? (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleDevicePhotoUpload}
                      className="hidden"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition hover:bg-emerald-50/20 flex flex-col items-center justify-center space-y-2"
                    >
                      {profilePhotoUrl ? (
                        <div className="relative">
                          <img 
                            src={profilePhotoUrl} 
                            alt="Host Preview" 
                            className="w-20 h-20 rounded-xl object-cover border-2 border-emerald-500 shadow"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Upload className="w-6 h-6" />
                        </div>
                      )}
                      <p className="text-xs font-bold text-gray-800">
                        {profilePhotoUrl ? 'Change Profile Photo' : 'Click to Upload Profile Photo'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <div className="relative w-56 h-48 bg-slate-900 rounded-2xl overflow-hidden border-2 border-emerald-400 mx-auto shadow">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1]" 
                      />
                      {!isCameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-300">
                          Camera loading...
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isUploadingPhoto || !isCameraActive}
                      onClick={captureLivePhoto}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 mx-auto disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{isUploadingPhoto ? 'Saving...' : 'Capture Snapshot'}</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setCurrentStep(1);
                    }}
                    className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canProceedStep2}
                    onClick={() => {
                      stopCamera();
                      setCurrentStep(3);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1 disabled:opacity-40"
                  >
                    <span>Continue to Govt ID</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Government ID Verification */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Select Document Type *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { type: 'AADHAAR', label: 'Aadhaar' },
                      { type: 'PAN', label: 'PAN Card' },
                      { type: 'DRIVING_LICENCE', label: 'Driving Lic.' },
                      { type: 'PASSPORT', label: 'Passport' },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setGovIdType(item.type as any)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition text-center ${
                          govIdType === item.type
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    {govIdType} Document Number *
                  </label>
                  <input
                    type={govIdType === 'AADHAAR' ? 'tel' : 'text'}
                    inputMode={govIdType === 'AADHAAR' ? 'numeric' : 'text'}
                    required
                    value={govIdNumber}
                    onChange={(e) => setGovIdNumber(formatGovIdInput(e.target.value, govIdType))}
                    placeholder={
                      govIdType === 'AADHAAR' ? '2345 6789 0123' :
                      govIdType === 'PAN' ? 'ABCDE1234F' : 'Document Number'
                    }
                    maxLength={govIdType === 'AADHAAR' ? 14 : govIdType === 'PAN' ? 10 : 16}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm font-mono tracking-wider uppercase text-gray-900"
                  />
                </div>

                {/* Optional doc proof */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
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
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isUploadingDoc ? 'Uploading...' : govIdDocUrl ? 'Replace Proof' : 'Upload Proof (Optional)'}</span>
                    </button>
                    {govIdDocUrl && (
                      <span className="text-xs text-emerald-700 font-bold">✓ Attached</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !govIdNumber}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black rounded-xl shadow-lg transition text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying with DigiLocker...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify & Complete e-KYC</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>

      </div>
    </div>
  );
};
export default HostIdentityVerificationModal;
