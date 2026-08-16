import React from 'react';
import { AlertCircle, FileX, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const LoadingState = ({ message = 'Loading infrastructure intelligence data...' }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center min-h-[240px]">
    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{message}</p>
  </div>
);

export const EmptyState = ({
  icon: Icon = FileX,
  title = 'No records found',
  description = 'There are no items to display for the selected criteria.',
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 min-h-[240px]">
    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
      <Icon className="w-6 h-6" />
    </div>
    <h4 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h4>
    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">{description}</p>
    {actionLabel && onAction && (
      <Button size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export const ErrorState = ({
  title = 'Unable to load data',
  message = 'An error occurred while connecting to the server. Please try again.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl min-h-[200px]">
    <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
    <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">{title}</h4>
    <p className="text-xs text-red-600 dark:text-red-300 max-w-md mt-1 mb-4">{message}</p>
    {onRetry && (
      <Button size="sm" variant="outline" icon={RefreshCw} onClick={onRetry}>
        Retry Connection
      </Button>
    )}
  </div>
);
