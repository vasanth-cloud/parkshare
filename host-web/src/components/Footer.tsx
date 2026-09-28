import React from 'react';
import { ShieldCheck, DollarSign } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-emerald-950 text-emerald-300 mt-auto border-t border-emerald-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="ParkShare" className="h-8 w-8 object-contain bg-white rounded p-0.5" />
            <span className="font-bold text-white tracking-tight">ParkShare Host Web</span>
            <span className="text-xs bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded border border-emerald-800">Captain Portal</span>
          </div>

          <div className="flex items-center space-x-6 text-sm text-emerald-300">
            <span className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Automated Payouts</span>
            </span>
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>4-Digit PIN Security</span>
            </span>
          </div>

          <div className="text-xs text-emerald-400">
            © {new Date().getFullYear()} ParkShare Host Network. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
