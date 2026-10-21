import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  ChevronDown,
  Sparkles,
  CreditCard,
  HelpCircle,
  CheckCircle2,
  Camera,
  Loader2,
  Gift,
  Bell,
  MapPin,
  LifeBuoy,
  Plus,
  Trash2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  AlertTriangle,
  Award,
  Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserAvatar } from '../components/UserAvatar';
import { api } from '../services/api';
import { Vehicle } from '../types';

interface SavedAddress {
  id: string;
  tag: 'Home' | 'Office' | 'Other';
  label: string;
  fullAddress: string;
  city: string;
  pincode: string;
  isDefault?: boolean;
}

interface NotificationSettings {
  gateAlerts: boolean;
  expiryReminders: boolean;
  whatsappUpdates: boolean;
  promoOffers: boolean;
}

type SectionKey = 'vehicles' | 'rewards' | 'alerts' | 'addresses' | 'support';

interface CustomerProfilePageProps {
  onNavigateTab?: (tab: 'home' | 'explore' | 'bookings' | 'saved' | 'profile') => void;
}

export const CustomerProfilePage: React.FC<CustomerProfilePageProps> = ({ onNavigateTab }) => {
  const { user, logout, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRentalContext = Boolean(onNavigateTab) || location.pathname.startsWith('/services/rentals') || location.pathname.startsWith('/rentals');

  // Vertical accordion state: which section is expanded (null = all collapsed)
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>('vehicles');

  // Photo upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 1. Vehicles State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [newRegNumber, setNewRegNumber] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('CAR');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);

  // 2. Rewards State
  const [parkCoins, setParkCoins] = useState(350);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // 3. Alerts & Notifications State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    try {
      const stored = localStorage.getItem('parkshare_customer_notifications');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      gateAlerts: true,
      expiryReminders: true,
      whatsappUpdates: true,
      promoOffers: false,
    };
  });

  // 4. Saved Addresses State
  const [addresses, setAddresses] = useState<SavedAddress[]>(() => {
    try {
      const stored = localStorage.getItem('parkshare_customer_addresses');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'addr-1',
        tag: 'Home',
        label: 'My Residence',
        fullAddress: 'Plot 42, 3rd Avenue, Anna Nagar East',
        city: 'Chennai',
        pincode: '600102',
        isDefault: true,
      },
      {
        id: 'addr-2',
        tag: 'Office',
        label: 'Tech Park Bay',
        fullAddress: 'Tidel Park, Ground Floor Bay 4, Rajiv Gandhi Salai',
        city: 'Chennai',
        pincode: '600113',
        isDefault: false,
      },
    ];
  });

  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddrTag, setNewAddrTag] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [newAddrLabel, setNewAddrLabel] = useState('');
  const [newAddrFull, setNewAddrFull] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('Chennai');
  const [newAddrPincode, setNewAddrPincode] = useState('');

  // 5. Help & Support State
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState('SPACE_OCCUPIED');
  const [disputeNotes, setDisputeNotes] = useState('');
  const [disputeSent, setDisputeSent] = useState(false);

  useEffect(() => {
    if (user) {
      api.getMe()
        .then((freshUser) => updateUser(freshUser))
        .catch(() => {});

      setLoadingVehicles(true);
      api.getVehicles()
        .then((vList) => setVehicles(vList || []))
        .catch(() => {})
        .finally(() => setLoadingVehicles(false));
    }
  }, []);

  const toggleSection = (section: SectionKey) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const handleToggleNotification = (key: keyof NotificationSettings) => {
    const updated = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(updated);
    localStorage.setItem('parkshare_customer_notifications', JSON.stringify(updated));
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const handleCopyReferral = () => {
    const refCode = `PARK-${(user?.full_name || 'DRIVER').split(' ')[0].toUpperCase()}`;
    navigator.clipboard.writeText(refCode);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrFull.trim()) {
      alert('Please enter a street address');
      return;
    }
    const newAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      tag: newAddrTag,
      label: newAddrLabel.trim() || newAddrTag,
      fullAddress: newAddrFull.trim(),
      city: newAddrCity.trim() || 'Chennai',
      pincode: newAddrPincode.trim() || '600001',
      isDefault: addresses.length === 0,
    };
    const updated = [...addresses, newAddr];
    setAddresses(updated);
    localStorage.setItem('parkshare_customer_addresses', JSON.stringify(updated));
    setShowAddAddressForm(false);
    setNewAddrLabel('');
    setNewAddrFull('');
    setNewAddrPincode('');
  };

  const handleDeleteAddress = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    setAddresses(updated);
    localStorage.setItem('parkshare_customer_addresses', JSON.stringify(updated));
  };

  const handleSetDefaultAddress = (id: string) => {
    const updated = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    setAddresses(updated);
    localStorage.setItem('parkshare_customer_addresses', JSON.stringify(updated));
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegNumber.trim()) {
      alert('Please enter vehicle registration number (e.g. TN 09 BX 4021)');
      return;
    }
    setSavingVehicle(true);
    try {
      const added = await api.addVehicle({
        registration_number: newRegNumber.trim().toUpperCase(),
        vehicle_type: newVehicleType,
        model: newVehicleModel.trim() || undefined,
        is_default: vehicles.length === 0,
      });
      setVehicles([added, ...vehicles]);
      setShowAddVehicleForm(false);
      setNewRegNumber('');
      setNewVehicleModel('');
    } catch (err: any) {
      alert(err.message || 'Failed to save vehicle');
    } finally {
      setSavingVehicle(false);
    }
  };

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

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center mx-auto">
            <User className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Sign In to View Profile</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access your saved vehicles, rewards, addresses, and bookings.
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

  const referralCode = `PARK-${(user.full_name || 'DRIVER').split(' ')[0].toUpperCase()}`;

  const faqs = [
    {
      q: 'How does digital gate entry pass & QR work?',
      a: 'When you arrive at the reserved parking space, open Bookings to show your digital QR code to the scanner camera or enter the 4-digit PIN code on the keypad to unlock the barrier.'
    },
    {
      q: 'Can I extend my parking or acting driver duration?',
      a: 'Yes! Navigate to your active booking card and tap "Extend Session". You can extend parking in 30-minute intervals or chauffeur duty in 1-hour slots subject to availability.'
    },
    {
      q: 'Are acting chauffeurs background-verified & trained?',
      a: 'All ParkCo acting drivers undergo RTO commercial driving license checks, government criminal background checks, and manual & automatic transmission road tests.'
    },
    {
      q: 'What is the cancellation and refund policy?',
      a: 'You receive 100% full instant refund to your original payment method if cancelled at least 30 minutes before your slot commences.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-6 px-4 max-w-md mx-auto space-y-4 font-sans transition-colors duration-200 pb-24">
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
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
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Profile</h1>
            <p className="text-xs text-slate-500">Tap any section below to view details</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-amber-400 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Clean User Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
        <div className="relative flex-shrink-0">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-sm">
            <UserAvatar user={user} size="lg" showBorder={false} className="w-14 h-14 rounded-full object-cover" />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 transition cursor-pointer"
            title="Change photo"
          >
            {isUploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Camera className="w-2.5 h-2.5" />}
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
              {user.full_name || 'Customer'}
            </h2>
            <CheckCircle2 className="w-4 h-4 fill-emerald-100 text-emerald-600 flex-shrink-0" />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {user.email}
          </p>

          {user.phone_number && (
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {user.phone_number}
            </p>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VERTICAL EXPANDABLE SECTIONS (Clean, uncluttered, tap to view details)     */}
      {/* ========================================================================= */}
      <div className="space-y-3">

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 1: VEHICLES                                                     */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection('vehicles')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  Vehicles
                </span>
                <span className="text-[11px] text-slate-400">
                  {vehicles.length} vehicle(s) saved • Number plates & ANPR pass
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {vehicles.length}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedSection === 'vehicles' ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Expanded Content */}
          {expandedSection === 'vehicles' && (
            <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold text-slate-400">Registered Plates</span>
                <button
                  type="button"
                  onClick={() => setShowAddVehicleForm(!showAddVehicleForm)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddVehicleForm ? 'Cancel' : 'Add Vehicle'}</span>
                </button>
              </div>

              {/* Add Vehicle Inline Form */}
              {showAddVehicleForm && (
                <form onSubmit={handleAddVehicle} className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TN 09 BX 4021"
                      value={newRegNumber}
                      onChange={(e) => setNewRegNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold uppercase focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                      <select
                        value={newVehicleType}
                        onChange={(e) => setNewVehicleType(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none"
                      >
                        <option value="CAR">Car</option>
                        <option value="SUV">SUV</option>
                        <option value="BIKE">Bike</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Model (Optional)</label>
                      <input
                        type="text"
                        placeholder="Creta SX"
                        value={newVehicleModel}
                        onChange={(e) => setNewVehicleModel(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingVehicle}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                  >
                    {savingVehicle ? 'Saving...' : 'Save Vehicle'}
                  </button>
                </form>
              )}

              {/* Vehicles List */}
              {loadingVehicles ? (
                <div className="text-center py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" />
                </div>
              ) : vehicles.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 text-center space-y-1">
                  <p className="text-xs text-slate-400">No vehicles saved yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vehicles.map((v) => (
                    <div
                      key={v.id}
                      className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-900 font-mono font-black text-xs">
                          <span className="bg-blue-600 text-white text-[8px] px-1 py-1 font-bold">IND</span>
                          <span className="px-2 py-1 tracking-wider text-slate-900 dark:text-white">
                            {v.registration_number}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            {v.model || v.vehicle_type}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">{v.vehicle_type}</span>
                        </div>
                      </div>

                      {v.is_default && (
                        <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-1 text-right">
                <Link
                  to="/vehicles"
                  className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center justify-end space-x-0.5"
                >
                  <span>Open Full Garage</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 2: REWARDS                                                      */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection('rewards')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  Rewards & ParkCoins
                </span>
                <span className="text-[11px] text-slate-400">
                  {parkCoins} Coins • 3 Promo vouchers & referrals
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {parkCoins}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedSection === 'rewards' ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Expanded Content */}
          {expandedSection === 'rewards' && (
            <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3.5 animate-in fade-in duration-150">
              
              {/* Wallet Balance Strip */}
              <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 rounded-2xl p-3.5 border border-amber-300/60 dark:border-amber-700/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider block">
                    ParkCoins Balance
                  </span>
                  <div className="flex items-baseline space-x-1.5 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{parkCoins}</span>
                    <span className="text-xs font-bold text-slate-500">Coins (₹{parkCoins} value)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                     Silver Tier • Auto-applies at checkout
                  </span>
                </div>
                <div className="text-3xl"></div>
              </div>

              {/* Promo Vouchers */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Tap to Copy Promo Code
                </span>

                {[
                  { code: 'PARK50', title: 'Flat ₹50 OFF', desc: 'Valid on driveway & society parking' },
                  { code: 'SPACLEAN', title: '20% OFF Car Spa', desc: 'Doorstep foam bath & detailing' },
                  { code: 'CHAUFFEUR100', title: '₹100 OFF Driver', desc: 'Valid on 4+ hour bookings' },
                ].map((c) => (
                  <div
                    key={c.code}
                    className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                          {c.code}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{c.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{c.desc}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCoupon(c.code)}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedCoupon === c.code ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 text-[10px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Referral Strip */}
              <div className="bg-slate-900 text-white rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 block">Refer & Earn ₹100</span>
                  <span className="font-mono text-xs text-emerald-400 font-bold">{referralCode}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1 cursor-pointer"
                >
                  {copiedReferral ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  <span>{copiedReferral ? 'Copied' : 'Share'}</span>
                </button>
              </div>

            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 3: ALERTS & NOTIFICATIONS                                       */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection('alerts')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  Alerts & Notifications
                </span>
                <span className="text-[11px] text-slate-400">
                  Gate pass pop-ups, expiry warnings & WhatsApp
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Active
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedSection === 'alerts' ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Expanded Content */}
          {expandedSection === 'alerts' && (
            <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pt-1">
                <div className="pr-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Gate Barrier Pass Pop-up
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Auto-displays entry QR code on arrival at gate
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotification('gateAlerts')}
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer flex-shrink-0 ${
                    notificationSettings.gateAlerts ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${notificationSettings.gateAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <div className="pr-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Session Expiry Reminders
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Alert 15 mins before parking slot or driver ends
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotification('expiryReminders')}
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer flex-shrink-0 ${
                    notificationSettings.expiryReminders ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${notificationSettings.expiryReminders ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <div className="pr-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    WhatsApp Booking Passes
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Receive driver contact & parking PIN on WhatsApp
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotification('whatsappUpdates')}
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer flex-shrink-0 ${
                    notificationSettings.whatsappUpdates ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${notificationSettings.whatsappUpdates ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <div className="pr-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Flash Deals & Rate Drops
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Occasional alerts for nearby parking discounts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotification('promoOffers')}
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer flex-shrink-0 ${
                    notificationSettings.promoOffers ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${notificationSettings.promoOffers ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 4: SAVED ADDRESSES                                              */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection('addresses')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  Saved Addresses
                </span>
                <span className="text-[11px] text-slate-400">
                  {addresses.length} saved destinations (Home, Office)
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {addresses.length}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedSection === 'addresses' ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Expanded Content */}
          {expandedSection === 'addresses' && (
            <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold text-slate-400">Your Locations</span>
                <button
                  type="button"
                  onClick={() => setShowAddAddressForm(!showAddAddressForm)}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddAddressForm ? 'Cancel' : 'Add Address'}</span>
                </button>
              </div>

              {/* Add Address Inline Form */}
              {showAddAddressForm && (
                <form onSubmit={handleAddAddress} className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Home', 'Office', 'Other'] as const).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNewAddrTag(tag)}
                        className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                          newAddrTag === tag
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Label</label>
                    <input
                      type="text"
                      placeholder="e.g. My Apartment, Work Annex"
                      value={newAddrLabel}
                      onChange={(e) => setNewAddrLabel(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Full Address</label>
                    <textarea
                      rows={2}
                      placeholder="Door no, Street, Landmark"
                      value={newAddrFull}
                      onChange={(e) => setNewAddrFull(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Save Address
                  </button>
                </form>
              )}

              {/* Address List */}
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between"
                  >
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {addr.tag ==='Home'?'Home': addr.tag ==='Office'?'Office':''+ addr.tag}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.2 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                        {addr.fullAddress}, {addr.city}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1">
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-[10px] text-slate-400 hover:text-emerald-600 font-bold px-1.5 py-1"
                        >
                          Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 5: HELP & SUPPORT                                               */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection('support')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  Help & Support
                </span>
                <span className="text-[11px] text-slate-400">
                  24/7 Hotline, WhatsApp concierge & FAQs
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                Live
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedSection === 'support' ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Expanded Content */}
          {expandedSection === 'support' && (
            <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3.5 animate-in fade-in duration-150">
              
              {/* Quick Contacts */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <a
                  href="tel:18004197275"
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-1 hover:border-slate-400 transition"
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Hotline</span>
                  <span className="text-[10px] text-slate-400 font-mono">1800-419-7275</span>
                </a>

                <a
                  href="https://wa.me/919876543210?text=Hi%20ParkCo%20Support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-1 hover:border-slate-400 transition"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">WhatsApp</span>
                  <span className="text-[10px] text-slate-400">Live agent chat</span>
                </a>
              </div>

              {/* Report Issue Button */}
              <button
                type="button"
                onClick={() => setShowDisputeModal(true)}
                className="w-full py-2.5 px-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Report Parking or Driver Issue</span>
              </button>

              {/* FAQs Accordion */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Frequently Asked Questions
                </span>

                {faqs.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full p-2.5 text-left flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-2.5 pb-2.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/40 dark:border-slate-700/40 pt-1.5">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Quick Navigation to Bookings */}
      {isRentalContext ? (
        onNavigateTab ? (
          <button
            type="button"
            onClick={() => onNavigateTab('bookings')}
            className="w-full bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  Rental Bookings
                </span>
                <span className="text-[11px] text-slate-400">
                  View active rental cars & bikes reservations
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <Link
            to="/services/rentals?tab=bookings"
            className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  Rental Bookings
                </span>
                <span className="text-[11px] text-slate-400">
                  View active rental cars & bikes reservations
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        )
      ) : (
        <div className="space-y-2.5">
          <Link
            to="/bookings"
            className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  Parking & Chauffeur Bookings
                </span>
                <span className="text-[11px] text-slate-400">
                  View active parking passes & chauffeur trips
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          <Link
            to="/services/rentals?tab=bookings"
            className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  Rental Cars & Bikes Bookings
                </span>
                <span className="text-[11px] text-slate-400">
                  View active rental reservations & passes
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      )}

      {/* Log Out Button */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-slate-200/90 dark:border-slate-800 hover:border-rose-200 text-xs font-extrabold flex items-center justify-center space-x-2 transition shadow-xs cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out of Account</span>
      </button>

      <p className="text-center text-[10px] text-slate-400 pt-1">
        ParkCo • v1.2.0 • 24/7 Driver Concierge
      </p>

      {/* Modal: Report Problem */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            {disputeSent ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Ticket Submitted</h3>
                <p className="text-xs text-slate-500">We will respond on WhatsApp or call you within 10 minutes.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowDisputeModal(false);
                    setDisputeSent(false);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Report Problem</span>
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Category</label>
                    <select
                      value={disputeCategory}
                      onChange={(e) => setDisputeCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="SPACE_OCCUPIED">Spot occupied by unauthorized car</option>
                      <option value="BARRIER_ISSUE">Gate barrier QR or PIN not opening</option>
                      <option value="DRIVER_DELAY">Acting driver delayed</option>
                      <option value="PAYMENT_ISSUE">Payment deducted but pass pending</option>
                      <option value="OTHER">Other inquiry</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Details of the issue..."
                      value={disputeNotes}
                      onChange={(e) => setDisputeNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDisputeModal(false)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisputeSent(true)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 cursor-pointer"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
