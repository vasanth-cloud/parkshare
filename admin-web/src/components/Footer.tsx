import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 mt-auto border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="ParkShare" className="h-8 w-8 object-contain bg-white rounded p-0.5" />
            <span className="font-bold text-white tracking-tight">ParkShare Superadmin Console</span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Encrypted Operations Audit</span>
          </div>

          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} ParkShare Infrastructure Platform.
          </div>
        </div>
      </div>
    </footer>
  );
};
