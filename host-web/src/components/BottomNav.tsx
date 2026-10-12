import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  KeyRound, 
  Plus, 
  ShieldCheck, 
  Layers,
  User as UserIcon, 
  X, 
  DollarSign, 
  LogOut, 
  ArrowRight, 
  CheckCircle2, 
  Camera,
  MapPin,
  Edit2,
  Check,
  Sun,
  Moon,
  Monitor,
  Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { HostAvatar } from './HostAvatar';
import { compressImageToDataUrl } from '../utils/imageCompressor';

export const BottomNav: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUpdateMsg, setPhotoUpdateMsg] = useState('');

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  // Initialize edit fields when opening edit mode
  const openEditMode = () => {
    setEditFullName(user.full_name || '');
    setEditPhone(user.phone_number || '');
    setEditAddress(user.address || '');
    setEditCity(user.city || '');
    setEditState(user.state || '');
    setEditPincode(user.pincode || '');
    setIsEditing(true);
    setSaveSuccessMsg('');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      full_name: editFullName.trim(),
      phone_number: editPhone.trim(),
      address: editAddress.trim(),
      city: editCity.trim(),
      state: editState.trim(),
      pincode: editPincode.trim(),
    });

    setSaveSuccessMsg('✓ Profile & Address updated successfully!');
    setIsEditing(false);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setPhotoUpdateMsg('Saving photo...');

    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 240, 0.85);

      if (compressedDataUrl) {
        try {
          localStorage.setItem('parkshare_host_avatar', compressedDataUrl);
        } catch {}
        updateUser({ profile_photo_url: compressedDataUrl });
      }

      setPhotoUpdateMsg('✓ Photo updated!');
      setTimeout(() => setPhotoUpdateMsg(''), 2500);

      api.uploadFile(file, file.name)
        .then((res) => {
          if (res?.url) {
            api.updateProfilePhoto(res.url).catch(() => {});
          }
        })
        .catch(() => {
          if (compressedDataUrl) {
            api.updateProfilePhoto(compressedDataUrl).catch(() => {});
          }
        });
    } catch {
      setPhotoUpdateMsg('Failed to update photo');
      setTimeout(() => setPhotoUpdateMsg(''), 2500);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-emerald-100/80 dark:border-slate-800 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] transition-colors duration-200">
        <div className="max-w-md mx-auto px-3 py-1.5 flex items-center justify-between">
          
          {/* 1. Services Overview */}
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                location.pathname === '/' || location.pathname === '/services' ? 'text-[#0f8b5f] dark:text-emerald-400' : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
              }`
            }
          >
            <div className={`p-1 rounded-xl transition ${location.pathname === '/' || location.pathname === '/services' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Services</span>
          </NavLink>

          {/* 2. Host Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-[#0f8b5f] dark:text-emerald-400' : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
              }`
            }
          >
            <div className={`p-1 rounded-xl transition ${isActive('/dashboard') ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Dashboard</span>
          </NavLink>

          {/* 3. List Space Action FAB */}
          <div className="flex-1 flex justify-center -mt-5">
            <NavLink
              to="/create-listing"
              className="relative group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#0f8b5f] to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:scale-105 active:scale-95 transition-transform duration-200 border-4 border-white dark:border-slate-900">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black text-[#0f8b5f] dark:text-emerald-400 block text-center mt-0.5 tracking-tight">
                List Space
              </span>
            </NavLink>
          </div>

          {/* 4. Earnings */}
          <NavLink
            to="/earnings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-[#0f8b5f] dark:text-emerald-400' : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
              }`
            }
          >
            <div className={`p-1 rounded-xl transition ${isActive('/earnings') ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Earnings</span>
          </NavLink>

          {/* 5. Profile */}
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setShowProfileDrawer(true);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              showProfileDrawer ? 'text-[#0f8b5f] dark:text-emerald-400' : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-0.5 rounded-full transition ${showProfileDrawer ? 'ring-2 ring-[#0f8b5f]' : ''}`}>
              <HostAvatar
                url={user.profile_photo_url}
                name={user.full_name}
                size="sm"
              />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Profile</span>
          </button>

        </div>
      </nav>

      {/* Profile Slide-up Drawer / Modal */}
      {showProfileDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 border border-gray-100 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {isEditing ? 'Edit Host Profile & Address' : 'Host Profile'}
                </h3>
                {user.is_identity_verified && (
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                    Verified
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={openEditMode}
                    className="p-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 hover:text-[#0f8b5f] text-xs font-bold flex items-center space-x-1 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowProfileDrawer(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Success Message */}
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* ================= EDIT MODE FORM ================= */}
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase">
                    Mobile Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Address Section */}
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-900 dark:text-white">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Host Residential / Space Address</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-slate-400">
                      Street Address / Flat / Building No.
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="e.g. Flat 402, Sunshine Heights, 12th Main Rd"
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600 dark:text-slate-400">
                        City
                      </label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="e.g. Bengaluru"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600 dark:text-slate-400">
                        State
                      </label>
                      <input
                        type="text"
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        placeholder="e.g. Karnataka"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-slate-400">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={editPincode}
                      onChange={(e) => setEditPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 560038"
                      className="w-36 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                {/* Save & Cancel Actions */}
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#0f8b5f] hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Profile & Address</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* ================= VIEW MODE ================= */
              <>
                {/* Host Identity Card */}
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 space-y-3.5">
                  <div className="flex items-center space-x-3.5">
                    <div className="relative group flex-shrink-0">
                      <HostAvatar
                        url={user.profile_photo_url}
                        name={user.full_name}
                        size="xl"
                        className="border-2 border-[#0f8b5f]"
                      />
                      <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0f8b5f] text-white flex items-center justify-center shadow-xs cursor-pointer hover:bg-emerald-700 transition">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhoto}
                        />
                      </label>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.full_name}</h4>
                        <span className="inline-flex items-center text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-[#0f8b5f] mr-0.5" />
                          Host
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                      {user.phone_number && (
                        <p className="text-xs text-gray-600 dark:text-slate-300 font-mono mt-0.5">{user.phone_number}</p>
                      )}
                      {photoUpdateMsg && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">{photoUpdateMsg}</p>
                      )}
                    </div>
                  </div>

                  {/* Registered Host Address Box */}
                  <div className="pt-2.5 border-t border-emerald-200/60 dark:border-emerald-800/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-bold text-gray-800 dark:text-slate-200">Host Address</span>
                          {user.address ? (
                            <p className="text-gray-600 dark:text-slate-300 leading-snug mt-0.5">
                              {user.address}
                              {user.city ? `, ${user.city}` : ''}
                              {user.state ? `, ${user.state}` : ''}
                              {user.pincode ? ` - ${user.pincode}` : ''}
                            </p>
                          ) : (
                            <p className="text-gray-400 dark:text-slate-500 italic mt-0.5">
                              No address added yet
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openEditMode}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex-shrink-0"
                      >
                        {user.address ? 'Edit' : '+ Add Address'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Earnings & Financial Hub Card */}
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileDrawer(false);
                    navigate('/earnings');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50/60 dark:from-emerald-950/40 dark:to-slate-800/80 border border-emerald-200/70 dark:border-emerald-800/50 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all group text-left shadow-xs"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#0f8b5f] text-white flex items-center justify-center font-bold shadow-xs">
                      <DollarSign className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">Earnings & Payouts</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300">
                          Wallet
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">View daily revenue & bank settlements</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-xs font-bold text-[#0f8b5f] dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Partner Multi-Service Expansion Options */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                      Partner Ecosystem Services
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Earn More
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Acting Driver Partner */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileDrawer(false);
                        navigate('/register/driver');
                      }}
                      className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-400 text-left transition group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-lg">🧑‍✈️</span>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200 px-1.5 py-0.5 rounded">
                          Driver
                        </span>
                      </div>
                      <div className="text-xs font-black text-gray-900 dark:text-white">Acting Driver</div>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">
                        Register as certified chauffeur partner
                      </p>
                    </button>

                    {/* Car Spa Partner */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileDrawer(false);
                        navigate('/register/car-spa');
                      }}
                      className="p-3 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-800/60 hover:border-cyan-400 text-left transition group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-lg">✨</span>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-cyan-200/80 dark:bg-cyan-900/80 text-cyan-900 dark:text-cyan-200 px-1.5 py-0.5 rounded">
                          Car Spa
                        </span>
                      </div>
                      <div className="text-xs font-black text-gray-900 dark:text-white">Car Spa Partner</div>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">
                        Register wash center or mobile van
                      </p>
                    </button>
                  </div>
                </div>

                {/* Theme & Display Mode */}
                <div className="p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center space-x-1.5">
                      {isDark ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                      <span>Theme & Display Mode</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 capitalize">
                      {theme}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 bg-gray-200/70 dark:bg-slate-900/80 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        theme === 'light'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        theme === 'dark'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Dark</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('system')}
                      className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        theme === 'system'
                          ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-xs'
                          : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Auto</span>
                    </button>
                  </div>
                </div>

                {/* Quick Info & Compliance */}
                <div className="flex items-center justify-between px-2 text-[11px] text-gray-400 dark:text-slate-500">
                  <span>ParkShare Partner v1.0</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileDrawer(false);
                      navigate('/privacy');
                    }}
                    className="hover:underline hover:text-emerald-700 dark:hover:text-emerald-400 transition"
                  >
                    Privacy Policy
                  </button>
                </div>

                {/* Logout Button */}
                <div className="pt-1 border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileDrawer(false);
                      logout();
                      navigate('/auth');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-xs transition flex items-center justify-center space-x-2 border border-rose-200/80 dark:border-rose-900/60"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Host Account</span>
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
};
export default BottomNav;
