import React from 'react';
import { DollarSign, ArrowUpRight, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const HostEarningsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center space-x-2">
          <DollarSign className="w-7 h-7 text-emerald-700" />
          <span>Host Earnings & Payouts</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">Track gross income, platform fees (10%), and automated bank transfers</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-2">
          <span className="text-xs text-gray-400 font-semibold uppercase">Total Gross Revenue</span>
          <div className="text-3xl font-extrabold text-gray-900">₹14,850</div>
          <p className="text-[11px] text-emerald-600 flex items-center space-x-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+18.4% this month</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-2">
          <span className="text-xs text-gray-400 font-semibold uppercase">Platform Fees (10%)</span>
          <div className="text-3xl font-extrabold text-emerald-800">₹1,485</div>
          <p className="text-[11px] text-gray-500 font-semibold">Standard platform fee</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-2">
          <span className="text-xs text-gray-400 font-semibold uppercase">Net Bank Payout</span>
          <div className="text-3xl font-extrabold text-emerald-700">₹13,365</div>
          <p className="text-[11px] text-emerald-700 font-semibold">Transferred to UPI</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
          <CreditCard className="w-5 h-5 text-emerald-700" />
          <span>Payout Method</span>
        </h2>

        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex justify-between items-center text-xs">
          <div>
            <span className="font-bold text-emerald-950 block">UPI Direct Payout</span>
            <span className="text-gray-600">Connected: host@okaxis</span>
          </div>
          <span className="bg-emerald-600 text-white font-bold px-3 py-1 rounded-full text-[10px]">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
