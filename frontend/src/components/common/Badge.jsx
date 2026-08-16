import React from 'react';
import { getSeverityConfig } from '../../constants/severity';

export const Badge = ({ children, variant = 'neutral', size = 'md', className = '' }) => {
  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    primary: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span className={`inline-flex items-center rounded-md border ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};

export const SeverityBadge = ({ level, size = 'md' }) => {
  const config = getSeverityConfig(level);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-semibold text-xs ${config.color}`}>
      <span className={`w-2 h-2 rounded-full ${config.badge}`}></span>
      {config.label}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const s = (status || 'NEW').toUpperCase().replace(' ', '_');
  const styles = {
    NEW: 'bg-sky-50 text-sky-700 border-sky-200',
    UNDER_REVIEW: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ASSIGNED: 'bg-purple-50 text-purple-700 border-purple-200',
    IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    VERIFIED: 'bg-teal-50 text-teal-700 border-teal-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
  };

  const currentStyle = styles[s] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${currentStyle}`}>
      {status || 'New'}
    </span>
  );
};
