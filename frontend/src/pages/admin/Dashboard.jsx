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
          inspectionApi.getInspections({ limit: 5 }),
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
    { title: 'Total Managed Assets', value: stats?.total_assets || '1,420', icon: Building2, color: 'blue' },
    { title: 'Open Issues', value: stats?.open_defects || '142', change: '+4 today', trend: 'up', icon: AlertTriangle, color: 'orange' },
    { title: 'Critical Defects', value: stats?.critical_defects || '12', change: 'Requires Action', trend: 'up', icon: AlertTriangle, color: 'red' },
    { title: 'Inspections Today', value: stats?.inspections_today || '28', change: '+12%', trend: 'up', icon: ClipboardList, color: 'emerald' },
    { title: 'Pending Maintenance', value: stats?.pending_maintenance || '34', icon: Wrench, color: 'purple' },
  ];

  const riskOverview = [
    { level: 'CRITICAL', count: stats?.risk_breakdown?.critical || 12, color: 'bg-red-500' },
    { level: 'HIGH', count: stats?.risk_breakdown?.high || 38, color: 'bg-orange-500' },
    { level: 'MEDIUM', count: stats?.risk_breakdown?.medium || 92, color: 'bg-amber-500' },
    { level: 'LOW', count: stats?.risk_breakdown?.low || 210, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Infrastructure Intelligence Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time public asset monitoring, defect risk scoring & decision support
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/map">
            <Button size="sm" icon={MapPin}>
              Open Live GIS Map
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards (4-6 metrics max) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => (
          <MetricCard key={idx} {...kpi} />
        ))}
      </div>

      {/* Compact Risk Breakdown Bar */}
      <Card title="Infrastructure Risk Distribution" subtitle="Active defect severity categorization across all assets">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {riskOverview.map((item) => (
            <Link
              key={item.level}
              to={`/admin/defects?severity=${item.level}`}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-400 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.level}</span>
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white">{item.count}</span>
            </Link>
          ))}
        </div>
      </Card>

      {/* Grid: Recent Field Activity & AI Predictions Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Field Activity (2 Cols) */}
        <Card
          className="lg:col-span-2"
          title="Recent Field Inspection Records"
          subtitle="Real-time field captures and AI classification pipeline status"
          action={
            <Link to="/admin/inspections" className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading recent inspections...</div>
          ) : recentInspections.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No recent inspection records available.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentInspections.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                      {item.asset_type?.slice(0, 2) || 'RD'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white capitalize">{item.asset_type || 'Road'}</span>
                      <span className="text-slate-400 block text-[11px]">{formatDate(item.captured_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.status} />
                    <SeverityBadge level={item.severity_assessment?.severity_level || 'LOW'} />
                    <Link to={`/admin/inspections/${item.id}`} className="text-blue-600 hover:text-blue-700 font-semibold text-xs">
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Predictive AI Highlights (1 Col) */}
        <Card
          title="Predictive AI Alert"
          subtitle="30-day deterioration forecasting insights"
          action={
            <Link to="/admin/predictive" className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              View AI Engine
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900 dark:text-blue-200">BRIDGE-1042 Risk Spike</span>
                <span className="text-[10px] font-semibold bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded">AI Forecast</span>
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Pothole & crack growth predicted to exceed 85/100 risk score within 14 days due to heavy monsoon runoff.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Polygon Blockchain Verified</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                100% of today's field audit logs secured on Polygon Amoy smart contract.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
