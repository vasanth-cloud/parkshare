import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Car, Zap, ShieldCheck, ArrowRight, CheckCircle2, UserCheck, Key, Lock, Mail, Phone, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const WelcomeAuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>(initialTab);
  const [appRole, setAppRole] = useState<'PARKER' | 'HOST'>('PARKER'); // Driver vs Captain
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (authTab === 'signup') {
        await register({
          email,
          password,
          full_name: fullName,
          phone_number: phone,
          role: appRole,
        });
      }

      const user = await login(email, password);
      if (appRole === 'HOST' || user.roles.includes('HOST')) {
        navigate('/captain');
      } else {
        navigate('/search');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestAccount = (e: string, p: string, r: 'PARKER' | 'HOST') => {
    setEmail(e);
    setPassword(p);
    setAppRole(r);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      
      {/* Brand Header */}
      <div className="text-center max-w-md mx-auto mb-8 space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center font-black mx-auto shadow-lg shadow-emerald-500/20">
          <Car className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">ParkShare</h1>
        <p className="text-xs text-slate-400 font-medium">The 2-Sided Parking Platform (Driver & Captain Apps)</p>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-md w-full bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
        
        {/* Step 1: Select App Mode (Driver vs Captain) */}
        <div className="space-y-2">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 text-center">
            Select Your Account Type
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAppRole('PARKER')}
              className={`p-3 rounded-2xl border transition-all text-left flex items-center space-x-3 ${
                appRole === 'PARKER'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                appRole === 'PARKER' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}>
                🚗
              </div>
              <div>
                <span className="block font-black text-xs text-white">Driver App</span>
                <span className="text-[10px] text-slate-400 font-normal">Book parking</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAppRole('HOST')}
              className={`p-3 rounded-2xl border transition-all text-left flex items-center space-x-3 ${
                appRole === 'HOST'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                appRole === 'HOST' ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}>
                ⚡
              </div>
              <div>
                <span className="block font-black text-xs text-white">Captain App</span>
                <span className="text-[10px] text-slate-400 font-normal">Earn from space</span>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Sign In / Sign Up Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
          <button
            type="button"
            onClick={() => setAuthTab('signin')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              authTab === 'signin'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthTab('signup')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              authTab === 'signup'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Demo Quick Logins */}
        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-800 text-[11px]">
          <p className="font-extrabold text-slate-300 mb-2 text-center">Instant Demo Accounts:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTestAccount('parker@parkshare.com', 'Parker@123', 'PARKER')}
              className="py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 rounded-xl font-bold text-[11px] flex items-center justify-center space-x-1"
            >
              <span>🚗 Demo Driver</span>
            </button>
            <button
              type="button"
              onClick={() => handleTestAccount('host@parkshare.com', 'Host@123', 'HOST')}
              className="py-1.5 px-2 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 rounded-xl font-bold text-[11px] flex items-center justify-center space-x-1"
            >
              <span>⚡ Demo Captain</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/80 text-rose-300 text-xs p-3 rounded-xl border border-rose-800 text-center font-semibold">
            {error}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {authTab === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Full Name</label>
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700">
                <UserIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ananya Kumar"
                  className="bg-transparent text-sm w-full outline-none text-white placeholder-slate-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Email Address</label>
            <div className="flex items-center space-x-2 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={appRole === 'HOST' ? 'captain@parkshare.com' : 'driver@parkshare.com'}
                className="bg-transparent text-sm w-full outline-none text-white placeholder-slate-500"
              />
            </div>
          </div>

          {authTab === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Phone Number</label>
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="bg-transparent text-sm w-full outline-none text-white placeholder-slate-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Password</label>
            <div className="flex items-center space-x-2 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent text-sm w-full outline-none text-white placeholder-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3.5 font-black rounded-xl shadow-lg transition-all text-sm disabled:opacity-50 ${
              appRole === 'HOST'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {submitting
              ? 'Processing...'
              : authTab === 'signin'
              ? `Sign In as ${appRole === 'HOST' ? 'Captain' : 'Driver'}`
              : `Register as ${appRole === 'HOST' ? 'Captain' : 'Driver'}`}
          </button>

        </form>

      </div>

    </div>
  );
};
