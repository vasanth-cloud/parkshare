import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Calendar, 
  Car, 
  Sun, 
  Moon, 
  LogOut, 
  ChevronRight, 
  Sparkles,
  CreditCard,
  HelpCircle,
  CheckCircle2,
  Camera,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserAvatar } from '../components/UserAvatar';
import { api } from '../services/api';

export const CustomerProfilePage: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center border border-slate-200/90 dark:border-slate-800 shadow-md space-y-4">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center mx-auto">
            <User className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Sign In to View Profile</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access your bookings, saved vehicles, and parking passes.
          </p>
          <Link
            to="/auth"
            className="block w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-3 rounded-2xl text-xs transition shadow-xs"
          >
            Sign In or Register
          </Link>
        </div>
      </div>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploadRes = await api.uploadFile(file, file.name);
      if (uploadRes && uploadRes.url) {
        const updatedUser = await api.updateProfilePhoto(uploadRes.url);
        updateUser(updatedUser);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to update photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Fetch latest profile on mount
  React.useEffect(() => {
    api.getMe()
      .then((freshUser) => updateUser(freshUser))
      .catch((err) => console.warn('Could not refresh profile:', err));
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-6 px-4 max-w-md mx-auto space-y-4 font-sans transition-colors duration-200">
      
      {/* Page Header with Back Action */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
          title="Go Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">My Profile</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage account, theme & settings</p>
        </div>
      </div>

      {/* 1. Rounded Circular Photo Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center space-x-4 relative overflow-hidden">
        
        {/* Hidden File Input for Avatar Change */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />

        {/* Circular Avatar Container with Camera Badge */}
        <div className="relative flex-shrink-0 group">
          <div className="p-1 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 shadow-md">
            <UserAvatar user={user} size="lg" showBorder={false} className="w-20 h-20 rounded-full object-cover" />
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 transition-transform active:scale-95 cursor-pointer"
            title="Upload photo"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
              {user.full_name || 'ParkShare Driver'}
            </h2>
            <span className="p-0.5 text-emerald-600 dark:text-emerald-400" title="Verified Driver">
              <CheckCircle2 className="w-4 h-4 fill-emerald-100 dark:fill-emerald-950" />
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1 mt-0.5">
            <Mail className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate">{user.email}</span>
          </p>

          {user.phone_number && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
              <Phone className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
              <span>{user.phone_number}</span>
            </p>
          )}

          <div className="mt-2 flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              ● Active Driver
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center space-x-1"
            >
              <Camera className="w-3 h-3" />
              <span>{isUploading ? 'Uploading...' : 'Upload photo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Driver Photo Upload Card (Personalized Upload Only) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Driver Verification Photo</span>
          </span>
          {user.profile_photo_url && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
              Photo Uploaded
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Upload a clear photo of yourself from your device. This photo is used for security pass verification at parking gate barriers.
        </p>

        {uploadError && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            {uploadError}
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center space-x-2 transition border border-dashed border-slate-300 dark:border-slate-700 active:scale-[0.98] cursor-pointer"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Uploading image...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>{user.profile_photo_url ? 'Choose / Take Another Photo' : 'Upload Your Photo from Phone'}</span>
            </>
          )}
        </button>
      </div>

      {uploadError && (
        <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900">
          {uploadError}
        </div>
      )}

      {/* 2. Quick Links Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-2 border border-slate-200/90 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
        
        <Link
          to="/bookings"
          className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl transition"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">My Reservations</span>
              <span className="text-[10px] text-slate-400">View active passes & parking history</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/vehicles"
          className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl transition"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">My Vehicles</span>
              <span className="text-[10px] text-slate-400">Manage number plates & vehicle types</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        {/* Theme Switching Option */}
        <div
          onClick={toggleTheme}
          className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl transition cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-400">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Appearance Theme</span>
              <span className="text-[10px] text-slate-400">Currently: {isDark ? 'Midnight Dark' : 'Mobility Light'}</span>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
            {isDark ? 'Switch to Light ☀️' : 'Switch to Dark 🌙'}
          </span>
        </div>

      </div>

      {/* 3. Driver Protection & Support Badge */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 flex items-center space-x-3">
        <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <div>
          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">Verified Driver Account</span>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            Protected with OTP 2-factor authentication & instant entry passes.
          </p>
        </div>
      </div>

      {/* 4. Logout Action */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-slate-200/90 dark:border-slate-800 hover:border-rose-200 font-extrabold py-3.5 px-4 rounded-2xl text-xs transition flex items-center justify-center space-x-2 shadow-xs"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out of Account</span>
      </button>

      <p className="text-center text-[10px] text-slate-400 pt-2">
        ParkShare Driver App • Version 1.0.0
      </p>

    </div>
  );
};
