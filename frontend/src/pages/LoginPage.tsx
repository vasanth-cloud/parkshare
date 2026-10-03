import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, UserCheck, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.roles.includes('HOST')) {
        navigate('/host/dashboard');
      } else if (user.roles.includes('ADMIN')) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestAccount = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-1">Log in to manage your bookings or parking space</p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-200">
            {error}
          </div>
        )}



        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. parker@parkshare.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
            Register here
          </Link>
        </div>

      </div>
    </div>
  );
};
