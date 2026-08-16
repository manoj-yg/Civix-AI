import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { User, Shield, MapPin, LogOut, CheckCircle2 } from 'lucide-react';

export const FieldProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Field Inspector Profile</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Account details and municipal credentials</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xl font-bold mx-auto border-2 border-blue-500">
          {user?.full_name?.charAt(0) || 'I'}
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{user?.full_name || 'Municipal Field Inspector'}</h3>
          <p className="text-xs text-slate-500">{user?.email || 'inspector@civix.gov'}</p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Shield className="w-3.5 h-3.5" />
          <span>Role: {user?.role || 'INSPECTOR'}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
        <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Assigned Jurisdiction</h4>
        
        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <span className="text-slate-500">Municipality Zone</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">Zone 4 - Central Ward</span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <span className="text-slate-500">Device Hardware</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">Android Field Capture Terminal</span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <span className="text-slate-500">Sync Status</span>
          <span className="font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> All Synced
          </span>
        </div>
      </div>

      <Button fullWidth variant="danger" icon={LogOut} onClick={handleLogout}>
        Logout Session
      </Button>
    </div>
  );
};
