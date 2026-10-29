import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Droplets,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

type ServiceDraft = {
  key: string;
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
};

const inputCls =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500';

export const RegisterCarSpaPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [operatingHours, setOperatingHours] = useState('08:00 AM - 08:00 PM');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [services, setServices] = useState<ServiceDraft[]>([
    { key: '1', name: 'Exterior Foam Wash', description: '', price: '399', duration_minutes: '45' },
    { key: '2', name: 'Interior Deep Clean', description: '', price: '699', duration_minutes: '60' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .getMyCarSpa()
      .then(() => navigate('/partner/car-spa/dashboard', { replace: true }))
      .catch(() => {});
  }, [user, navigate]);

  const addService = () => {
    setServices((prev) => [
      ...prev,
      { key: String(Date.now()), name: '', description: '', price: '', duration_minutes: '45' },
    ]);
  };

  const updateService = (key: string, patch: Partial<ServiceDraft>) => {
    setServices((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const removeService = (key: string) => {
    setServices((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.key !== key)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    setError('');
    const cleaned = services
      .map((s) => ({
        name: s.name.trim(),
        description: s.description.trim() || null,
        price: Number(s.price),
        duration_minutes: Number(s.duration_minutes) || 45,
      }))
      .filter((s) => s.name && s.price > 0);

    if (!name.trim() || !city.trim() || !address.trim() || !phone.trim()) {
      setError('Spa name, city, address and phone are required.');
      return;
    }
    if (cleaned.length === 0) {
      setError('Add at least one service with a price.');
      return;
    }

    setSubmitting(true);
    try {
      await api.registerCarSpa({
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        phone: phone.trim(),
        description: description.trim() || null,
        photo_url: photoUrl.trim() || null,
        operating_hours: operatingHours.trim() || '08:00 AM - 08:00 PM',
        services: cleaned,
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-cyan-600 mx-auto" />
          <h1 className="text-xl font-black">Submitted for approval</h1>
          <p className="text-xs text-slate-500">
            Your car spa is pending admin review. Customers will see it only after it is approved.
          </p>
          <button
            type="button"
            onClick={() => navigate('/partner/car-spa/dashboard')}
            className="w-full py-3 rounded-2xl bg-cyan-600 text-white text-xs font-black"
          >
            Open spa dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/services')} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs font-black text-cyan-700 dark:text-cyan-300">Register Car Spa</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 mt-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Droplets className="w-6 h-6 text-cyan-600" /> Workshop car spa
          </h1>
          <p className="text-xs text-slate-500">
            Customers bring their car to your workshop. Add services with prices. Admin must approve before you go live.
          </p>
        </div>

        {error && (
          <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
          <h2 className="text-sm font-black">Spa details</h2>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-slate-500">Spa name *</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-500">City *</label>
              <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-500">Phone *</label>
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-slate-500">Workshop address *</label>
            <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-slate-500">Operating hours</label>
            <input className={inputCls} value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-slate-500">Description</label>
            <textarea className={`${inputCls} font-medium`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-slate-500">Photo URL (optional)</label>
            <input className={inputCls} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black">Services & prices</h2>
            <button type="button" onClick={addService} className="text-[11px] font-bold text-cyan-600 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add service
            </button>
          </div>
          {services.map((svc) => (
            <div key={svc.key} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="Service name"
                  value={svc.name}
                  onChange={(e) => updateService(svc.key, { name: e.target.value })}
                />
                <button type="button" onClick={() => removeService(svc.key)} className="p-2 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inputCls}
                  placeholder="Price (INR)"
                  type="number"
                  min="1"
                  value={svc.price}
                  onChange={(e) => updateService(svc.key, { price: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Duration (min)"
                  type="number"
                  min="15"
                  value={svc.duration_minutes}
                  onChange={(e) => updateService(svc.key, { duration_minutes: e.target.value })}
                />
              </div>
              <input
                className={inputCls}
                placeholder="Short description (optional)"
                value={svc.description}
                onChange={(e) => updateService(svc.key, { description: e.target.value })}
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit for admin approval
        </button>
        <p className="text-center text-[11px] text-slate-400">
          Already registered? <Link to="/partner/car-spa/dashboard" className="text-cyan-600 font-bold">Open dashboard</Link>
        </p>
      </form>
    </div>
  );
};
