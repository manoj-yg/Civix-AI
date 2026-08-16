import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MapPin, Camera, History, User } from 'lucide-react';

export const BottomNav = () => {
  const navs = [
    { path: '/field', label: 'Home', icon: Home, end: true },
    { path: '/field/map', label: 'Live Map', icon: MapPin },
    { path: '/field/scan', label: 'AI Scan', icon: Camera, highlight: true },
    { path: '/field/history', label: 'Issues', icon: History },
    { path: '/field/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around max-w-md mx-auto shadow-xl">
      {navs.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-all ${
                item.highlight
                  ? 'text-white bg-blue-600 px-3 py-1.5 rounded-xl font-bold shadow-md scale-105'
                  : isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`
            }
          >
            <Icon className={item.highlight ? 'w-5 h-5' : 'w-4 h-4'} />
            <span className="text-[10px] leading-none">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
