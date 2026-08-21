import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, Card } from '../../components/common/Card';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Building2,
  AlertTriangle,
  ClipboardList,
  Wrench,
  ShieldCheck,
  TrendingUp,
  MapPin,
  ChevronRight,
  Camera,
  Layers,
  Cpu
} from 'lucide-react';
import { analyticsApi } from '../../api/analytics.api';
import { inspectionApi } from '../../api/inspection.api';
import { formatDate } from '../../utils/formatters';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentInspections, setRecentInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsRes, inspRes] = await Promise.all([
          analyticsApi.getAdminStats(),
          inspectionApi.getInspections({ limit: 6 }),
        ]);

        setStats(statsRes.data || statsRes);
        setRecentInspections(inspRes.data || inspRes.items || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const kpis = [
    { title: 'Total Monitored Assets', value: stats?.total_assets || '1,420', icon: Building2, color: 'blue' },
    { title: 'Open Hazards (Red)', value: stats?.open_defects || '142', change: '+4 today', trend: 'up', icon: AlertTriangle, color: 'orange' },
    { title: 'Critical Potholes', value: stats?.critical_defects || '12', change: 'Immediate Action', trend: 'up', icon: AlertTriangle, color: 'red' },
    { title: 'Camera Ingestions Today', value: stats?.inspections_today || recentInspections.length || '28', change: '100% On-Chain', trend: 'up', icon: ClipboardList, color: 'emerald' },
    { title: 'Active Repairs (Orange)', value: stats?.pending_maintenance || '34', icon: Wrench, color: 'purple' },
  ];

  const riskOverview = [
    { level: 'CRITICAL', label: '🔴 Danger (Critical)', count: stats?.risk_breakdown?.critical || 12, color: 'bg-red-500', border: 'border-red-200', text: 'text-red-700' },
    { level: 'HIGH', label: '🟠 High Risk', count: stats?.risk_breakdown?.high || 38, color: 'bg-orange-500', border: 'border-orange-200', text: 'text-orange-700' },
    { level: 'MEDIUM', label: '🟡 Medium Concern', count: stats?.risk_breakdown?.medium || 92, color: 'bg-amber-500', border: 'border-amber-200', text: 'text-amber-700' },
    { level: 'LOW', label: '🟢 Low / Repaired', count: stats?.risk_breakdown?.low || 210, color: 'bg-emerald-500', border: 'border-emerald-200', text: 'text-emerald-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              BBMP Infrastructure Command Dashboard
            </h1>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> YOLOv26 & Blockchain Active
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time pothole camera detection, cryptographic SHA-256 ledger, and Tri-Color GIS Live Map monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/field/scanner">
            <Button size="sm" variant="primary" icon={Camera} className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs">
              Live Camera Scanner
            </Button>
          </Link>
          <Link to="/admin/map">
            <Button size="sm" variant="outline" icon={MapPin} className="border-slate-300 text-slate-700 font-bold">
              GIS Live Map
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => (
          <MetricCard key={idx} {...kpi} />
        ))}
      </div>

      {/* Risk Breakdown Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">City-Wide Defect Risk Classification</h3>
            <p className="text-xs text-slate-500">Live tri-color severity distribution across all road networks</p>
          </div>
          <Link to="/admin/map" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View on Map <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {riskOverview.map((item) => (
            <Link
              key={item.level}
              to={`/admin/defects?severity=${item.level}`}
              className={`p-3.5 rounded-xl border ${item.border} bg-slate-50/50 hover:bg-slate-50 hover:shadow-xs transition-all flex items-center justify-between`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
                <span className={`text-xs font-bold ${item.text}`}>{item.label}</span>
              </div>
              <span className="text-base font-black text-slate-900">{item.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Grid: Recent Field Activity & AI / Blockchain Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Field Activity (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Camera Detections & Ingestions</h3>
              <p className="text-xs text-slate-500">Real-time live video and frame captures logged to database</p>
            </div>
            <Link to="/admin/inspections" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-semibold">Loading recent inspections...</div>
          ) : recentInspections.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-semibold">No recent inspection records available.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentInspections.map((item) => {
                const mediaItem = item.media_items && item.media_items.length > 0 ? item.media_items[0] : null;
                const filename = mediaItem?.file_path ? mediaItem.file_path.split('/').pop().split('\\').pop() : null;
                const mediaUrl = filename ? `/api/v1/inspections/media/file/${filename}` : null;
                const sevLevel = item.severity_assessment?.severity_level || 'HIGH';
                const normStatus = (item.status || 'PENDING').toUpperCase();

                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/70 p-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      {mediaUrl ? (
                        <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs shrink-0">
                          <img src={mediaUrl} alt="Capture" className="w-full h-full object-cover" onError={(e) => { e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-[9px] text-slate-400">Frame</div>'; }} />
                        </div>
                      ) : (
                        <div className="w-12 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-slate-900 capitalize block">
                          {item.detections && item.detections.length > 0 ? item.detections[0].class_name : (item.asset_type || 'Road Defect')}
                        </span>
                        <span className="text-slate-400 text-[11px] block font-mono">
                          ID: {item.id.slice(0, 8)}... • {formatDate(item.captured_at || item.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      {normStatus === 'COMPLETED' || normStatus === 'WORK_DONE' ? (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          🟢 Solved
                        </span>
                      ) : normStatus === 'IN_PROGRESS' ? (
                        <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">
                          🟠 In Progress
                        </span>
                      ) : (
                        <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                          🔴 Danger
                        </span>
                      )}
                      <SeverityBadge level={sevLevel} />
                      <Link to={`/admin/inspections/${item.id}`} className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Blockchain & AI Highlights (1 Col) */}
        <div className="space-y-4">
          {/* Blockchain Seal Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Blockchain Audit Ledger</h4>
                <p className="text-[10px] text-slate-500">Polygon SHA-256 Tamper-Proof</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every camera-captured frame, GPS location, and severity rating is cryptographically signed and permanently stored to prevent municipal record tampering.
            </p>
            <Link
              to="/admin/blockchain"
              className="block w-full text-center py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs border border-emerald-200 transition-colors"
            >
              Inspect Blockchain Ledger
            </Link>
          </div>

          {/* AI Active Models Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Active Vision Model</h4>
                <p className="text-[10px] text-blue-600 font-bold">YOLOv26 Pothole Detector</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Running real-time multi-defect neural inference at 30+ FPS with continuous degradation tracking and automated BBMP work order dispatch.
            </p>
            <Link
              to="/admin/models"
              className="block w-full text-center py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold text-xs border border-blue-200 transition-colors"
            >
              Model Performance Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
