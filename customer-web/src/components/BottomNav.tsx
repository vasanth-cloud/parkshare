import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MapPin, Calendar, User } from 'lucide-react';

interface BottomNavProps {
  onOpenChat?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = () => {
  const navItems = [
    { to: '/', label: 'Find Parking', icon: MapPin },
    { to: '/bookings', label: 'Bookings', icon: Calendar },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-3 inset-x-0 z-40 px-3 pointer-events-none">
      <nav className="max-w-sm mx-auto pointer-events-auto bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border border-white/70 dark:border-slate-800/80 rounded-[28px] p-1.5 shadow-[0_12px_36px_rgba(15,23,42,0.14)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all">
        <div className="flex items-center justify-between">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-[22px] transition-all duration-300 relative group active:scale-90 ${
                    isActive
                      ? 'bg-emerald-500/12 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-xs'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon
                        className={`w-5 h-5 transition-transform duration-300 ${
                          isActive ? 'scale-110 stroke-[2.4]' : 'group-hover:scale-105'
                        }`}
                      />
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                      )}
                    </div>
                    <span className="text-[10px] tracking-tight mt-0.5 leading-none font-bold">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
