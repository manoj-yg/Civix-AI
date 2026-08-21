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
  ShieldAlert,
  Sparkles
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/admin/map', label: 'GIS Live Map', icon: MapPin },
  { path: '/admin/inspections', label: 'Inspections & Media', icon: ClipboardList },
  { path: '/admin/defects', label: 'Defect Analysis', icon: AlertOctagon },
  { path: '/admin/blockchain', label: 'Blockchain Audit', icon: ShieldCheck },
  { path: '/admin/bbmp-operations', label: 'BBMP Operations', icon: ShieldAlert },
  { path: '/admin/maintenance', label: 'Work Orders', icon: Wrench },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/predictive', label: 'AI Degradation', icon: TrendingUp },
  { path: '/admin/reports', label: 'PDF Reports', icon: FileSpreadsheet },
  { path: '/admin/models', label: 'Model Monitoring', icon: Boxes },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white text-slate-700 border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col shadow-xs ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white font-black text-lg shadow-xs">
              C
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black text-slate-900 tracking-tight leading-tight">CIVIX<span className="text-blue-600">.AI</span></h1>
                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">LIVE</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">Infrastructure & Blockchain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors"
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
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 rounded-b-xl m-2 border rounded-xl">
          <div className="flex items-center justify-between font-bold text-slate-700">
            <span>CIVIX AI v2.0</span>
            <span className="text-emerald-600 text-[10px] flex items-center gap-1 font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Online
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">YOLOv26 • Polygon SHA-256</p>
        </div>
      </aside>
    </>
  );
};
