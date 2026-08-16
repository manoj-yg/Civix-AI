export const SEVERITY_LEVELS = {
  LOW: {
    label: 'Low',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    badge: 'bg-emerald-500',
    hex: '#10b981',
    description: 'Minor wear or surface defect. Monitor during routine inspections.',
    maxScore: 39,
  },
  MEDIUM: {
    label: 'Medium',
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    badge: 'bg-amber-500',
    hex: '#f59e0b',
    description: 'Moderate structural defect. Maintenance recommended within 30 days.',
    maxScore: 69,
  },
  HIGH: {
    label: 'High',
    color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
    badge: 'bg-orange-500',
    hex: '#f97316',
    description: 'Significant asset degradation. Schedule repair within 7 days.',
    maxScore: 89,
  },
  CRITICAL: {
    label: 'Critical',
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
    badge: 'bg-red-600',
    hex: '#dc2626',
    description: 'Severe structural hazard. Immediate emergency response required.',
    maxScore: 100,
  },
};

export const getSeverityConfig = (level) => {
  const norm = (level || 'LOW').toUpperCase();
  return SEVERITY_LEVELS[norm] || SEVERITY_LEVELS.LOW;
};
