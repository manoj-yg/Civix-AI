import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Shield, Wifi, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const FieldLayout = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ENGINEER';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 pb-20 max-w-md mx-auto relative border-x border-slate-200 dark:border-slate-800 shadow-2xl">
      {/* Field Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">CIVIX FIELD</h1>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">GPS Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 font-medium">
            <Wifi className="w-3 h-3" />
            <span>Online</span>
          </div>

          {isAdmin && (
            <Link
              to="/admin"
              title="Admin Portal"
              className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md"
            >
              <LayoutDashboard className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* Main Screen Outlet */}
      <main className="p-4">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
