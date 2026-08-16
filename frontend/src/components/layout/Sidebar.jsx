import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Building2,
  AlertOctagon,
  Wrench,
  BarChart3,
  TrendingUp,
  Lightbulb,
  FileSpreadsheet,
  ShieldCheck,
  Cpu,
  Boxes,
  Settings,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/admin/map', label: 'Live Map', icon: MapPin },
  { path: '/admin/inspections', label: 'Inspections', icon: ClipboardList },
  { path: '/admin/assets', label: 'Assets', icon: Building2 },
  { path: '/admin/defects', label: 'Defects', icon: AlertOctagon },
  { path: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/predictive', label: 'Predictive Intelligence', icon: TrendingUp },
  { path: '/admin/recommendations', label: 'Recommendations', icon: Lightbulb },
  { path: '/admin/reports', label: 'Reports', icon: FileSpreadsheet },
  { path: '/admin/blockchain', label: 'Blockchain Audit', icon: ShieldCheck },
  { path: '/admin/federated', label: 'Federated Learning', icon: Cpu },
  { path: '/admin/models', label: 'AI Model Monitoring', icon: Boxes },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide leading-tight">CIVIX AI</h1>
              <p className="text-[10px] text-slate-400 font-medium">Infrastructure Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500">
          <p className="font-semibold text-slate-400">CIVIX AI v2.0.0</p>
          <p className="truncate mt-0.5">Municipal Decision Platform</p>
        </div>
      </aside>
    </>
  );
};
