import React from 'react';
import { ShieldCheck, MapPin, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="hidden md:block bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 mt-auto border-t border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="ParkCo" className="h-8 w-8 object-contain bg-white rounded p-0.5 border border-slate-200 dark:border-slate-700" />
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">ParkCo Driver</span>
            <span className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 px-2 py-0.5 rounded-full font-bold">
              Driver Network
            </span>
          </div>

          <div className="flex items-center space-x-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Verified Private Spaces</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>Live GPS Guidance</span>
            </span>
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            © {new Date().getFullYear()} ParkCo Mobility. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
