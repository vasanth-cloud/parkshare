import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Zap, Lock, Mail, Phone, User as UserIcon, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CaptainAuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>(initialTab);
  
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
          role: 'HOST',
        });
      }

      await login(email, password);
      navigate('/captain');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      
      {/* Captain App Brand Header */}
      <div className="text-center max-w-md mx-auto mb-8 space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black mx-auto shadow-lg shadow-amber-500/20">
          <Zap className="w-9 h-9 fill-slate-950" />
        </div>
        <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-wider rounded-full border border-amber-500/30">
          ⚡ ParkShare Captain App
        </span>
        <h1 className="text-3xl font-black tracking-tight text-white">Earn Money From Your Space</h1>
        <p className="text-xs text-slate-400 font-medium">Turn driveways, apartment bays, or garages into daily passive income.</p>
      </div>

      {/* Captain Auth Card */}
      <div className="max-w-md w-full bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-2xl shadow-amber-500/10 space-y-6">
        
        {/* Sign In / Sign Up Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
          <button
            type="button"
            onClick={() => setAuthTab('signin')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              authTab === 'signin'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Captain Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthTab('signup')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              authTab === 'signup'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Captain Sign Up
          </button>
        </div>

        {/* Demo Captain Account Shortcut */}
        <div className="bg-amber-950/40 p-3 rounded-2xl border border-amber-800/60 text-[11px] text-center">
          <span className="font-bold text-amber-300">Instant Demo Captain Login: </span>
          <button
            type="button"
            onClick={() => { setEmail('host@parkshare.com'); setPassword('Host@123'); }}
            className="underline font-bold text-white hover:text-amber-300 ml-1"
          >
            host@parkshare.com
          </button>
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
                  placeholder="Rajesh Sharma"
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
                placeholder="captain@parkshare.com"
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
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm disabled:opacity-50"
          >
            {submitting
              ? 'Authenticating...'
              : authTab === 'signin'
              ? 'Sign In to Captain App'
              : 'Register as Captain'}
          </button>

        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          <span>Are you looking to park? </span>
          <Link to="/driver/auth" className="text-emerald-400 font-extrabold hover:underline">
            Go to Driver App
          </Link>
        </div>

      </div>

    </div>
  );
};
