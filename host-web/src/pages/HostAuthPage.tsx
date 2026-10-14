import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, getFullImageUrl } from '../services/api';
import { compressImageToDataUrl } from '../utils/imageCompressor';
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
  X,
  Eye,
  EyeOff,
  Calendar,
  ArrowLeft,
  Send
} from 'lucide-react';

export const HostAuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(
    searchParams.get('mode') !== 'signup' && searchParams.get('mode') !== 'register'
  );
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [legalName, setLegalName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [upiId, setUpiId] = useState('');

  const getFullPhoneNumber = () => {
    const clean = phone.trim();
    if (clean.startsWith('+')) return clean;
    return `${countryCode}${clean.replace(/\D/g, '')}`;
  };

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
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Government ID (Aadhaar / PAN / DL / Passport)
  const [govIdType, setGovIdType] = useState<'AADHAAR' | 'PAN' | 'DRIVING_LICENCE' | 'PASSPORT'>('AADHAAR');
  const [govIdNumber, setGovIdNumber] = useState('');

  // Helper to format ID numbers by document type (e.g. 4-4-4 for Aadhaar)
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
    const rawDigits = phone.trim().replace(/\D/g, '');
    if (!phone || rawDigits.length < 10) {
      setError('Please provide a valid 10-digit mobile number');
      return;
    }
    const fullPhone = getFullPhoneNumber();
    setError('');
    setSendingPhoneOtp(true);
    try {
      const res = await api.sendMobileOtp(fullPhone);
      setIsPhoneOtpSent(true);
      if (res.sms_delivered) {
        setInfoMsg(`✓ 6-digit verification code has been dispatched via real SMS to ${fullPhone}.`);
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
    const fullPhone = getFullPhoneNumber();
    setError('');
    setVerifyingPhoneOtp(true);
    try {
      await api.verifyMobileOtp(fullPhone, phoneOtp.trim());
      setIsPhoneVerified(true);
      setInfoMsg('✓ Mobile number successfully verified!');
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

        const compressedDataUrl = await compressImageToDataUrl(blob, 240, 0.85);
        if (compressedDataUrl) {
          setProfilePhotoPreview(compressedDataUrl);
          setProfilePhotoUrl(compressedDataUrl);
          try {
            localStorage.setItem('parkshare_host_avatar', compressedDataUrl);
          } catch {}
        }

        try {
          const uploadRes = await api.uploadFile(blob, 'host_live_photo.jpg');
          if (uploadRes?.url) {
            setProfilePhotoUrl(uploadRes.url);
          }
          stopCamera();
          setInfoMsg('✓ Live face photo captured successfully!');
        } catch {
          stopCamera();
          setInfoMsg('✓ Live photo saved locally!');
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
      setProfilePhotoPreview(compressedDataUrl);
      setProfilePhotoUrl(compressedDataUrl);
      try {
        localStorage.setItem('parkshare_host_avatar', compressedDataUrl);
      } catch {}
    }

    try {
      const res = await api.uploadFile(file, file.name);
      if (res?.url) {
        setProfilePhotoUrl(res.url);
      }
      setInfoMsg('✓ Profile photo uploaded successfully!');
    } catch {
      setInfoMsg('✓ Profile photo saved locally!');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const validateStep = (step: number): boolean => {
    setError('');
    if (step === 1) {
      if (!legalName || legalName.trim().length < 2) {
        setError('Please enter your full legal name as per government ID.');
        return false;
      }
      const digits = phone.trim().replace(/\D/g, '');
      if (!phone || digits.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return false;
      }
      if (!isPhoneVerified) {
        setError('Please verify your mobile number with the OTP code.');
        return false;
      }
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address.');
        return false;
      }
      if (!isEmailVerified) {
        setError('Please verify your email address with the OTP code.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (isUploadingPhoto) {
        setError('Please wait for your profile photo to finish uploading.');
        return false;
      }
      if (!profilePhotoUrl && !profilePhotoPreview) {
        setError('Host profile photo (upload or live camera) is required.');
        return false;
      }
      if (govIdType === 'AADHAAR') {
        const cleanAadhaar = govIdNumber.replace(/\D/g, '');
        if (cleanAadhaar.length !== 12) {
          setError('Please enter a valid 12-digit Aadhaar number (e.g. 2345 6789 0123).');
          return false;
        }
      } else if (govIdType === 'PAN') {
        const cleanPan = govIdNumber.replace(/\s+/g, '').toUpperCase();
        if (cleanPan.length !== 10) {
          setError('Please enter a valid 10-character PAN number (e.g. ABCDE1234F).');
          return false;
        }
      } else if (!govIdNumber || govIdNumber.trim().length < 4) {
        setError(`Please enter your valid ${govIdType} document number.`);
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!password || password.length < 6) {
        setError('Please create an account password of at least 6 characters.');
        return false;
      }
      return true;
    }
    return true;
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
        navigate('/');
      } else {
        // Enforce mandatory verification items during host registration
        if (!legalName || legalName.trim().length < 2) {
          setError('Full legal name is mandatory.');
          setLoading(false);
          return;
        }
        if (!isPhoneVerified) {
          setError('Mobile OTP verification is mandatory for host accounts.');
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
          phone_number: getFullPhoneNumber(),
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
        navigate('/?new_user=true');
      }
    } catch (err: any) {
      setError(err.message || 'Host authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#edf8f3] sm:py-6 sm:px-4 flex flex-col items-center justify-start">
      <div className="w-full max-w-[430px] bg-[#edf8f3] sm:rounded-[36px] sm:shadow-2xl overflow-hidden flex flex-col transition-all min-h-screen sm:min-h-0">
        
        {/* Top App Bar matching Image 1 */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0f8b5f] flex items-center justify-center text-white shadow-sm font-black text-xl">
              <div className="relative flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <div className="font-black text-lg text-emerald-950 leading-tight">ParkCo</div>
              <div className="text-[9px] font-bold text-gray-500 tracking-widest uppercase">HOST PORTAL</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setIsLogin(!isLogin);
              setError('');
              setInfoMsg('');
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#0c6b4e] hover:bg-[#09543d] text-white text-xs font-semibold shadow-sm transition"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{isLogin ? 'Sign Up' : 'Sign In'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Hero Section with Car Photo matching Image 1 */}
        <div className="px-5 pt-3 pb-8 flex items-center justify-between">
          <div className="max-w-[175px]">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
              {isLogin ? (
                <>
                  Share Your <br />
                  <span className="text-[#0f8b5f]">Parking Space</span>
                </>
              ) : (
                <>
                  Create Your <br />
                  <span className="text-[#0f8b5f]">Host Account</span>
                </>
              )}
            </h1>
            <div className="w-9 h-1 bg-[#0f8b5f] rounded-full my-1.5"></div>
            <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
              {isLogin 
                ? 'Turn unused spaces into earning opportunities!' 
                : 'List your parking spaces and start earning today!'}
            </p>
          </div>
          
          {/* Car Image in clean rounded container */}
          <div className="w-36 h-24 sm:w-40 sm:h-28 rounded-2xl overflow-hidden shadow-sm border border-emerald-100/80 flex-shrink-0 bg-white">
            <img 
              src="/hero-car.jpg" 
              alt="Parking Space" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Floating White Bottom Card matching Image 1 */}
        <div className="relative -mt-4 bg-white rounded-t-[36px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-5 pt-6 pb-6 space-y-4 flex-grow">
          {/* Calendar Badge */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center -mt-12 mb-1.5 bg-white p-1 rounded-2xl shadow-sm ring-4 ring-[#edf8f3]">
              <span className="text-emerald-500 font-bold text-xs mr-2 select-none">›</span>
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-200/70 rounded-xl flex items-center justify-center text-emerald-700">
                <div className="relative flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[#0f8b5f]" />
                  <span className="absolute inset-0 flex items-center justify-center pt-1 font-black text-[10px] text-[#0f8b5f]">P</span>
                </div>
              </div>
              <span className="text-emerald-500 font-bold text-xs ml-2 select-none">‹</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {isLogin ? (
                <>Sign <span className="text-[#0f8b5f]">In</span></>
              ) : (
                <>Sign <span className="text-[#0f8b5f]">Up</span></>
              )}
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {isLogin
                ? 'Manage your listed parking spaces & daily earnings'
                : 'Create an account to list parking spaces & earn passive income'}
            </p>
          </div>

          {/* Pill Tab Switcher */}
          <div className="bg-[#f0f5f2] p-1 rounded-full border border-gray-200/60 max-w-xs mx-auto flex">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setIsLogin(true);
                setError('');
                setInfoMsg('');
              }}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                isLogin
                  ? 'bg-white text-[#0f8b5f] shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError('');
                setInfoMsg('');
              }}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                !isLogin
                  ? 'bg-[#0f8b5f] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sign Up</span>
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
            <div className="space-y-4">
              {/* 3-Step Wizard Indicator matching Mockup */}
              <div className="px-1 py-1">
                <div className="flex items-center justify-between relative">
                  {/* Connecting Track Line */}
                  <div className="absolute top-4 left-6 right-6 h-[2px] bg-gray-200 -z-0">
                    <div 
                      className="h-full bg-[#0f8b5f] transition-all duration-300"
                      style={{ width: signupStep === 1 ? '0%' : signupStep === 2 ? '50%' : '100%' }}
                    />
                  </div>

                  {/* Step 1 */}
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className="relative z-10 flex flex-col items-center focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      signupStep === 1
                        ? 'bg-[#0f8b5f] text-white ring-4 ring-[#0f8b5f]/20 shadow-sm'
                        : signupStep > 1
                        ? 'bg-[#0f8b5f] text-white shadow-xs'
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}>
                      {signupStep > 1 ? '✓' : '1'}
                    </div>
                    <span className={`text-[10px] mt-1.5 font-bold transition-colors ${
                      signupStep === 1 ? 'text-[#0f8b5f]' : signupStep > 1 ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      Identity Details
                    </span>
                  </button>

                  {/* Step 2 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (signupStep === 3 || validateStep(1)) setSignupStep(2);
                    }}
                    className="relative z-10 flex flex-col items-center focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      signupStep === 2
                        ? 'bg-[#0f8b5f] text-white ring-4 ring-[#0f8b5f]/20 shadow-sm'
                        : signupStep > 2
                        ? 'bg-[#0f8b5f] text-white shadow-xs'
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}>
                      {signupStep > 2 ? '✓' : '2'}
                    </div>
                    <span className={`text-[10px] mt-1.5 font-bold transition-colors ${
                      signupStep === 2 ? 'text-[#0f8b5f]' : signupStep > 2 ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      Documents
                    </span>
                  </button>

                  {/* Step 3 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep(1) && validateStep(2)) setSignupStep(3);
                    }}
                    className="relative z-10 flex flex-col items-center focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      signupStep === 3
                        ? 'bg-[#0f8b5f] text-white ring-4 ring-[#0f8b5f]/20 shadow-sm'
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}>
                      3
                    </div>
                    <span className={`text-[10px] mt-1.5 font-bold transition-colors ${
                      signupStep === 3 ? 'text-[#0f8b5f]' : 'text-gray-400'
                    }`}>
                      Complete
                    </span>
                  </button>
                </div>
              </div>

              {/* ================= STEP 1: IDENTITY DETAILS ================= */}
              {signupStep === 1 && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  {/* Full Legal Name */}
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-100/90 shadow-2xs space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0f8b5f] flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <label className="text-xs font-bold text-gray-800">
                        Full Legal Name *
                      </label>
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. Rajesh Kumar Sharma"
                        className="w-full px-3.5 py-2.5 bg-gray-50/70 border border-gray-200/90 rounded-xl focus:bg-white focus:border-[#0f8b5f] focus:ring-1 focus:ring-[#0f8b5f] focus:outline-none text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition"
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-100/90 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0f8b5f] flex items-center justify-center flex-shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <label className="text-xs font-bold text-gray-800">
                          Mobile Number *
                        </label>
                      </div>
                      {isPhoneVerified && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {/* Region / Country Code Selector */}
                      <div className="relative flex-shrink-0">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          disabled={isPhoneVerified}
                          className="h-10 pl-2.5 pr-6 bg-gray-50/80 border border-gray-200/90 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:border-[#0f8b5f] focus:outline-none appearance-none cursor-pointer disabled:bg-gray-100"
                        >
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+971">🇦🇪 +971</option>
                          <option value="+65">🇸🇬 +65</option>
                          <option value="+61">🇦🇺 +61</option>
                        </select>
                        <span className="absolute right-2 top-3 pointer-events-none text-[9px] text-gray-400">▼</span>
                      </div>

                      {/* Phone input */}
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        disabled={isPhoneVerified}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="98765 43210"
                        className="flex-1 min-w-0 h-10 px-3 bg-gray-50/80 border border-gray-200/90 rounded-xl focus:bg-white focus:border-[#0f8b5f] focus:ring-1 focus:ring-[#0f8b5f] focus:outline-none text-xs sm:text-sm text-gray-900 placeholder-gray-400 font-medium transition disabled:bg-gray-100"
                      />

                      {/* Action */}
                      {!isPhoneVerified ? (
                        <button
                          type="button"
                          disabled={sendingPhoneOtp || phone.replace(/\D/g, '').length < 10}
                          onClick={handleSendPhoneOtp}
                          className="h-10 px-3.5 bg-[#0f8b5f] hover:bg-[#0c754f] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs disabled:opacity-40 flex-shrink-0"
                        >
                          <span>{sendingPhoneOtp ? 'Sending...' : isPhoneOtpSent ? 'Resend' : 'Send OTP'}</span>
                        </button>
                      ) : (
                        <div className="h-10 px-2.5 bg-emerald-50 text-[#0f8b5f] rounded-xl flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-[#0f8b5f]" />
                        </div>
                      )}
                    </div>

                    {/* Dedicated Clean OTP Box */}
                    {isPhoneOtpSent && !isPhoneVerified && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-600 font-medium">Enter 6-digit SMS code:</span>
                          <span className="text-[10px] text-emerald-700 font-bold">Sent to {countryCode} {phone}</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={phoneOtp}
                            onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="• • • • • •"
                            className="flex-1 h-9 px-3 bg-white border border-emerald-300 rounded-lg text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-[#0f8b5f] focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={verifyingPhoneOtp || phoneOtp.length !== 6}
                            onClick={handleVerifyPhoneOtp}
                            className="h-9 px-4 bg-[#0f8b5f] hover:bg-[#0c754f] text-white rounded-lg text-xs font-bold transition disabled:opacity-40 flex-shrink-0"
                          >
                            {verifyingPhoneOtp ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Email Address */}
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-100/90 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0f8b5f] flex items-center justify-center flex-shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <label className="text-xs font-bold text-gray-800">
                          Email Address *
                        </label>
                      </div>
                      {isEmailVerified && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
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
                        className="flex-1 min-w-0 h-10 px-3 bg-gray-50/80 border border-gray-200/90 rounded-xl focus:bg-white focus:border-[#0f8b5f] focus:ring-1 focus:ring-[#0f8b5f] focus:outline-none text-xs sm:text-sm text-gray-900 placeholder-gray-400 font-medium transition disabled:bg-gray-100"
                      />

                      {!isEmailVerified ? (
                        <button
                          type="button"
                          disabled={sendingEmailOtp || !email.includes('@')}
                          onClick={handleSendEmailOtp}
                          className="h-10 px-3.5 bg-[#0f8b5f] hover:bg-[#0c754f] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs disabled:opacity-40 flex-shrink-0"
                        >
                          <span>{sendingEmailOtp ? 'Sending...' : isEmailOtpSent ? 'Resend' : 'Send OTP'}</span>
                        </button>
                      ) : (
                        <div className="h-10 px-2.5 bg-emerald-50 text-[#0f8b5f] rounded-xl flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-[#0f8b5f]" />
                        </div>
                      )}
                    </div>

                    {/* Dedicated Clean OTP Box */}
                    {isEmailOtpSent && !isEmailVerified && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-600 font-medium">Enter 6-digit email code:</span>
                          <span className="text-[10px] text-emerald-700 font-bold">Check inbox</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={emailOtp}
                            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="• • • • • •"
                            className="flex-1 h-9 px-3 bg-white border border-emerald-300 rounded-lg text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-[#0f8b5f] focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={verifyingEmailOtp || emailOtp.length !== 6}
                            onClick={handleVerifyEmailOtp}
                            className="h-9 px-4 bg-[#0f8b5f] hover:bg-[#0c754f] text-white rounded-lg text-xs font-bold transition disabled:opacity-40 flex-shrink-0"
                          >
                            {verifyingEmailOtp ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 1 Continue Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep(1)) setSignupStep(2);
                    }}
                    className="w-full bg-[#0f8b5f] hover:bg-[#0c754f] text-white font-bold py-3.5 px-4 rounded-full shadow-md shadow-[#0f8b5f]/25 transition text-xs sm:text-sm flex items-center justify-center space-x-2 mt-2"
                  >
                    <span>Continue to Documents</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ================= STEP 2: DOCUMENTS ================= */}
              {signupStep === 2 && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  {/* Host Profile Photo */}
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-100/90 shadow-2xs">
                    <div className="flex items-center space-x-3.5">
                      {/* Avatar Circle */}
                      <div className="relative flex-shrink-0">
                        {(profilePhotoPreview || profilePhotoUrl) ? (
                          <div className="relative">
                            <img
                              src={profilePhotoPreview || getFullImageUrl(profilePhotoUrl)}
                              alt="Host Profile"
                              className="w-16 h-16 rounded-full object-cover border-2 border-[#0f8b5f] shadow-sm bg-gray-100"
                              onError={(e) => {
                                if (profilePhotoPreview && e.currentTarget.src !== profilePhotoPreview) {
                                  e.currentTarget.src = profilePhotoPreview;
                                }
                              }}
                            />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0f8b5f] text-white flex items-center justify-center text-[10px] shadow font-bold">
                              ✓
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-emerald-50/80 border-2 border-dashed border-emerald-300 flex items-center justify-center text-[#0f8b5f]">
                            <UserIcon className="w-8 h-8 text-[#0f8b5f]/70" />
                          </div>
                        )}
                      </div>

                      {/* Content & Action Buttons */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-gray-900">Profile Photo *</h3>
                          {(profilePhotoPreview || profilePhotoUrl) ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Attached</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-medium">Clear face photo</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 mb-2 truncate">
                          {(profilePhotoPreview || profilePhotoUrl) ? 'Photo ready for your host profile' : 'Helps drivers easily recognise you'}
                        </p>

                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleDevicePhotoUpload}
                            className="hidden"
                          />
                          {!(profilePhotoPreview || profilePhotoUrl) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setPhotoMode('camera');
                                  startCamera();
                                }}
                                disabled={isUploadingPhoto}
                                className="px-3 py-1.5 bg-[#0f8b5f] hover:bg-[#0c754f] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Camera</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingPhoto}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                              >
                                <Upload className="w-3.5 h-3.5 text-gray-600" />
                                <span>{isUploadingPhoto ? 'Uploading...' : 'Gallery'}</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setProfilePhotoUrl('');
                                setProfilePhotoPreview('');
                                stopCamera();
                              }}
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Change Photo</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Live Camera Viewport (shown only when camera is active) */}
                    {photoMode === 'camera' && isCameraActive && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 animate-in fade-in">
                        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-48 border border-emerald-500 shadow-inner flex items-center justify-center">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform -scale-x-100"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isUploadingPhoto}
                            onClick={captureLivePhoto}
                            className="flex-1 py-2 bg-[#0f8b5f] hover:bg-[#0c754f] text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{isUploadingPhoto ? 'Uploading...' : 'Capture Photo'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Government ID Verification */}
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-100/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#0f8b5f] flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <label className="text-xs font-bold text-gray-900">
                          Government ID *
                        </label>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Instant e-KYC
                      </span>
                    </div>

                    {/* Clean High-Contrast Pill Selector */}
                    <div className="flex p-1 bg-gray-100/90 rounded-xl gap-1">
                      {[
                        { id: 'AADHAAR', label: 'Aadhaar' },
                        { id: 'PAN', label: 'PAN' },
                        { id: 'DRIVING_LICENCE', label: 'Driving Lic.' },
                        { id: 'PASSPORT', label: 'Passport' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setGovIdType(item.id as any);
                            setGovIdNumber(prev => formatGovIdInput(prev, item.id as any));
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all text-center ${
                            govIdType === item.id
                              ? 'bg-[#0f8b5f] text-white shadow-xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Clean Document Number Input with Auto-Formatting */}
                    <div>
                      <input
                        type={govIdType === 'AADHAAR' ? 'tel' : 'text'}
                        inputMode={govIdType === 'AADHAAR' ? 'numeric' : 'text'}
                        required
                        value={govIdNumber}
                        onChange={(e) => setGovIdNumber(formatGovIdInput(e.target.value, govIdType))}
                        placeholder={
                          govIdType === 'AADHAAR'
                            ? 'e.g. 2345 6789 0123'
                            : govIdType === 'PAN'
                            ? 'e.g. ABCDE1234F'
                            : govIdType === 'DRIVING_LICENCE'
                            ? 'e.g. DL-1420110012345'
                            : 'e.g. A1234567'
                        }
                        maxLength={
                          govIdType === 'AADHAAR'
                            ? 14 // 12 digits + 2 spaces (XXXX XXXX XXXX)
                            : govIdType === 'PAN'
                            ? 10
                            : govIdType === 'DRIVING_LICENCE'
                            ? 16
                            : 9
                        }
                        className="w-full h-11 px-3.5 bg-gray-50/80 border border-gray-200/90 rounded-xl text-xs sm:text-sm font-mono tracking-wider focus:bg-white focus:border-[#0f8b5f] focus:ring-1 focus:ring-[#0f8b5f] focus:outline-none placeholder-gray-400 transition"
                      />
                    </div>

                    {/* Subtle 1-line reassurance */}
                    <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 pt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0f8b5f] flex-shrink-0" />
                      <span>Encrypted & verified via official government records</span>
                    </div>
                  </div>

                  {/* Step 2 Back & Continue Buttons */}
                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="px-5 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-full text-xs sm:text-sm transition flex items-center space-x-1.5 shadow-2xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep(2)) setSignupStep(3);
                      }}
                      className="flex-1 bg-[#0f8b5f] hover:bg-[#0c754f] text-white font-bold py-3 px-4 rounded-full shadow-md shadow-[#0f8b5f]/25 transition text-xs sm:text-sm flex items-center justify-center space-x-2"
                    >
                      <span>Continue to Payout</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 3: COMPLETE ================= */}
              {signupStep === 3 && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  {/* Payout UPI ID */}
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-100/90 shadow-2xs space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0f8b5f] flex items-center justify-center flex-shrink-0 font-bold text-sm">
                        ₹
                      </div>
                      <label className="text-xs font-bold text-gray-800">
                        Payout UPI ID <span className="text-gray-400 font-normal">(for earnings)</span> *
                      </label>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="name@okaxis / mobile@upi"
                        className="w-full px-3.5 py-2.5 bg-gray-50/70 border border-gray-200/90 rounded-xl focus:bg-white focus:border-[#0f8b5f] focus:ring-1 focus:ring-[#0f8b5f] focus:outline-none text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition font-mono"
                      />
                      <p className="text-[10px] text-gray-500 mt-1 pl-1">
                        Direct automated daily payouts for your parking space bookings.
                      </p>
                    </div>
                  </div>

                  {/* Account Password */}
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-100/90 shadow-2xs space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0f8b5f] flex items-center justify-center flex-shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <label className="text-xs font-bold text-gray-800">
                        Account Password *
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create password (min 6 characters)"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50/70 border border-gray-200/90 rounded-xl focus:bg-white focus:border-[#0f8b5f] focus:ring-1 focus:ring-[#0f8b5f] focus:outline-none text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Trust Card */}
                  <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/70 space-y-1.5 text-xs text-emerald-950 font-medium">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0f8b5f] flex-shrink-0" />
                      <span>Instant space listing activation after registration</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0f8b5f] flex-shrink-0" />
                      <span>Direct daily bank deposits into your UPI ID</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0f8b5f] flex-shrink-0" />
                      <span>Zero security deposit & complete host protection</span>
                    </div>
                  </div>

                  {/* Step 3 Back & Submit Buttons */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setSignupStep(2)}
                      className="px-5 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-full text-xs sm:text-sm transition flex items-center space-x-1.5 shadow-2xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-[#0f8b5f] hover:bg-[#0c754f] text-white font-bold py-3.5 px-4 rounded-full shadow-md shadow-[#0f8b5f]/25 transition text-xs sm:text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <span>{loading ? 'Registering Host...' : 'Complete & Register'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Secure lock note below wizard */}
              <div className="flex items-center justify-center space-x-1.5 text-[10px] text-gray-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Your information is secure and only used for verification purposes.</span>
              </div>
            </div>
          ) : (
            /* ================= SIGN IN FIELDS ================= */
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="host@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-[#0f8b5f] focus:ring-1 focus:ring-[#0f8b5f] focus:outline-none text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-[#0f8b5f] focus:ring-1 focus:ring-[#0f8b5f] focus:outline-none text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0f8b5f] hover:bg-[#0c754f] text-white font-bold py-3.5 px-4 rounded-full shadow-md shadow-[#0f8b5f]/25 transition text-xs sm:text-sm flex items-center justify-center space-x-2 disabled:opacity-50 mt-3"
              >
                <span>{loading ? 'Processing...' : 'Sign In to Host Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </form>

        {/* Social Logins */}
        <div className="relative my-2.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200/80"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-2.5 text-gray-400 font-semibold tracking-wider">OR</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setError('Google Sign-In configuration required.');
            }}
            className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-2 border border-gray-200 rounded-full hover:bg-gray-50 transition text-[11px] font-semibold text-gray-700 shadow-2xs bg-white"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span className="truncate">Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setError('Apple Sign-In is coming soon.');
            }}
            className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-2 border border-gray-200 rounded-full hover:bg-gray-50 transition text-[11px] font-semibold text-gray-700 shadow-2xs bg-white"
          >
            <svg className="w-3.5 h-3.5 fill-current text-gray-900 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.58.67-1.09 1.74-.95 2.77 1 .08 2.05-.52 2.67-1.27z"/>
            </svg>
            <span className="truncate">Continue with Apple</span>
          </button>
        </div>

        <div className="text-center pt-2 pb-1">
          <button
            onClick={() => {
              stopCamera();
              setIsLogin(!isLogin);
              setError('');
              setInfoMsg('');
            }}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center justify-center space-x-1.5 mx-auto"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0f8b5f]" />
            <span>
              {isLogin ? (
                <>New Host? <strong className="text-[#0f8b5f] font-bold hover:underline">Complete Identity Verification & Register →</strong></>
              ) : (
                <>Already have a verified host account? <strong className="text-[#0f8b5f] font-bold hover:underline">Sign In →</strong></>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
