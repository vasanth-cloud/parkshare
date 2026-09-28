import React from 'react';
import { Car, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        <div>
          <div className="flex items-center space-x-2 text-white font-bold text-lg mb-3">
            <Car className="w-6 h-6 text-emerald-500" />
            <span>ParkShare</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            The peer-to-peer parking space marketplace. Connect with verified hosts or monetize your unused driveway or space.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">For Drivers</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/search" className="hover:text-emerald-400 transition-colors">Find Parking Space</a></li>
            <li><a href="/dashboard" className="hover:text-emerald-400 transition-colors">My Vehicles</a></li>
            <li><a href="/dashboard" className="hover:text-emerald-400 transition-colors">Active Bookings</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">For Hosts</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/host/onboarding" className="hover:text-emerald-400 transition-colors">List Your Parking Space</a></li>
            <li><a href="/host/dashboard" className="hover:text-emerald-400 transition-colors">Host Dashboard</a></li>
            <li><a href="/host/dashboard" className="hover:text-emerald-400 transition-colors">Earnings & Payouts</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Trust & Security</h4>
          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <span>Exact addresses revealed only after payment confirmation.</span>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-800 text-xs flex flex-col md:flex-row items-center justify-between">
        <p>© 2026 ParkShare Inc. All rights reserved.</p>
        <p className="flex items-center space-x-1 mt-2 md:mt-0">
          <span>Built with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>for seamless urban mobility.</span>
        </p>
      </div>
    </footer>
  );
};
