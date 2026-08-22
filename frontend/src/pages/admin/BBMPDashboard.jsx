import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  ShieldAlert,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Eye,
  MapPin,
  Calendar,
  UserCheck,
  RefreshCw,
  Flame,
  X
} from 'lucide-react';
import { inspectionApi } from '../../api/inspection.api';
import { reportApi } from '../../api/report.api';
import { gisApi } from '../../api/gis.api';
import { formatDate, formatCoords, formatAddress } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

export const BBMPDashboard = () => {
  const { user } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [stats, setStats] = useState({
    total_damages: 0,
    by_severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    by_status: { PENDING: 0, IN_PROGRESS: 0, WORK_DONE: 0, COMPLETED: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeSeverityTab, setActiveSeverityTab] = useState('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [infraFilter, setInfraFilter] = useState('ALL');

  // Status Update Modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusVal, setStatusVal] = useState('IN_PROGRESS');
  const [engineerVal, setEngineerVal] = useState('');
  const [notesVal, setNotesVal] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeSeverityTab, activeStatusFilter, infraFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeSeverityTab !== 'ALL') params.severity = activeSeverityTab;
      if (activeStatusFilter !== 'ALL') params.status = activeStatusFilter;
      if (infraFilter !== 'ALL') params.asset_type = infraFilter.toLowerCase();

      const [inspRes, statsRes] = await Promise.all([
        inspectionApi.getInspections(params),
        gisApi.getSummaryStats().catch(() => ({ data: null })),
      ]);

      const list = inspRes.data || inspRes.items || (Array.isArray(inspRes) ? inspRes : []);
      
      // Sort primarily by severity (CRITICAL first, then HIGH, then MEDIUM, then LOW)
      const severityWeights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const sorted = [...list].sort((a, b) => {
        const sevA = a.severity_assessment?.severity_level || 'LOW';
        const sevB = b.severity_assessment?.severity_level || 'LOW';
        const weightA = severityWeights[sevA] || 1;
        const weightB = severityWeights[sevB] || 1;
        if (weightB !== weightA) return weightB - weightA;
        return new Date(b.created_at || b.captured_at) - new Date(a.created_at || a.captured_at);
      });

      setInspections(sorted);

      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load BBMP operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpdateModal = (item) => {
    setSelectedItem(item);
    setStatusVal(item.status || 'IN_PROGRESS');
    setEngineerVal(item.assigned_engineer || user?.full_name || 'BBMP Ward Engineer');
    setNotesVal(item.work_notes || item.resolution_notes || '');
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setUpdating(true);
    try {
      await inspectionApi.updateInspectionStatus(selectedItem.id, {
        status: statusVal,
        assigned_engineer: engineerVal,
        work_notes: notesVal,
        resolution_notes: notesVal,
      });

      // Update in state
      setInspections((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                status: statusVal,
                assigned_engineer: engineerVal,
                work_notes: notesVal,
                resolution_notes: notesVal,
              }
            : item
        )
      );
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update work order. Please check backend connection.');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = inspections.filter((item) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const idMatch = (item.id || '').toLowerCase().includes(term);
    const typeMatch = (item.asset_type || '').toLowerCase().includes(term);
    const engMatch = (item.assigned_engineer || '').toLowerCase().includes(term);
    const notesMatch = (item.work_notes || '').toLowerCase().includes(term);
    return idMatch || typeMatch || engMatch || notesMatch;
  });

  return (
    <div className="space-y-5 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">BBMP & Engineering Operations Console</h1>
              <p className="text-xs text-slate-300">
                Municipal Severity-Prioritized Work Orders & Defect Resolution Management
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={reportApi.getSummaryPDFReportUrl({ severity: activeSeverityTab, asset_type: infraFilter })}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Executive Severity PDF</span>
          </a>
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950/60 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/80 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Critical Emergencies</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-red-600">{stats.by_severity?.CRITICAL || 0}</span>
              <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.2 rounded font-semibold">Immediate Action</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-950/60 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/80 text-orange-600 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">High Severity</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-orange-600">{stats.by_severity?.HIGH || 0}</span>
              <span className="text-[10px] text-orange-700 bg-orange-50 px-1.5 py-0.2 rounded font-semibold">High Priority</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-950/60 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">In Progress Works</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-blue-600">{stats.by_status?.IN_PROGRESS || 0}</span>
              <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-semibold">Active Crews</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Work Done / Resolved</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-emerald-600">
                {(stats.by_status?.WORK_DONE || 0) + (stats.by_status?.COMPLETED || 0)}
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'ALL', label: 'All Severities' },
            { id: 'CRITICAL', label: '🔴 Critical Risk', badgeClass: 'text-red-600 font-bold' },
            { id: 'HIGH', label: '🟠 High Risk', badgeClass: 'text-orange-600 font-bold' },
            { id: 'MEDIUM', label: '🟡 Medium Risk' },
            { id: 'LOW', label: '🟢 Low Risk' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSeverityTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSeverityTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={activeStatusFilter}
            onChange={(e) => setActiveStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
          >
            <option value="ALL">All Work Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WORK_DONE">Work Done</option>
          </select>

          <select
            value={infraFilter}
            onChange={(e) => setInfraFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
          >
            <option value="ALL">All Infrastructure</option>
            <option value="ROAD">Road</option>
            <option value="BRIDGE">Bridge</option>
            <option value="FLYOVER">Flyover</option>
            <option value="STREETLIGHT">Streetlight</option>
            <option value="FOOTPATH">Footpath</option>
          </select>

          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Severity-Ranked Work Order Table */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Severity & ID</th>
                <th className="py-3 px-4">Asset Type & Location</th>
                <th className="py-3 px-4">AI Defect Classification</th>
                <th className="py-3 px-4">Work Execution Status</th>
                <th className="py-3 px-4">Assigned Engineer / Remarks</th>
                <th className="py-3 px-4">Reported On</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading municipal work orders...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No defects matching the selected severity and filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const severity = item.severity_assessment?.severity_level || 'LOW';
                  const riskScore = Math.round((item.severity_assessment?.overall_score || 5.0) * 10);
                  const isCritical = severity === 'CRITICAL';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isCritical ? 'bg-red-50/20 dark:bg-red-950/10' : ''
                      }`}
                    >
                      {/* Severity & ID */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <SeverityBadge level={severity} />
                          <p className="font-mono text-[11px] text-slate-500 truncate max-w-[120px]">{item.id}</p>
                          <span className="text-[10px] font-bold text-red-600 block">Risk: {riskScore}/100</span>
                        </div>
                      </td>

                      {/* Asset & Area Address */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-900 capitalize block">
                            {item.asset_type || 'Road'} Segment
                          </span>
                          <span className="text-[11px] font-semibold text-slate-800 flex items-start gap-1 max-w-[200px]">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span>{formatAddress(item.work_notes || item.device_info?.address, item.latitude, item.longitude)}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block pl-4.5">
                            {formatCoords(item.latitude, item.longitude)}
                          </span>
                        </div>
                      </td>

                      {/* AI Defect Breakdown & Frame Preview */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {item.media_items && item.media_items.length > 0 && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                              <img
                                src={`/api/v1/inspections/media/file/${item.media_items[0].file_path.split(/[\\/]/).pop()}`}
                                alt="Capture"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          )}
                          <div className="space-y-0.5">
                            {item.detections && item.detections.length > 0 ? (
                              <span className="font-extrabold text-slate-900 block">
                                {item.detections[0].class_name} ({Math.round(item.detections[0].confidence * 100)}%)
                              </span>
                            ) : (
                              <span className="font-bold text-slate-800 block">Road Pothole Hazard</span>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                🔗 Polygon Verified
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Work Execution Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Assigned Engineer / Remarks */}
                      <td className="py-3 px-4 max-w-[180px]">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-xs truncate flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{item.assigned_engineer || 'Unassigned Crew'}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 truncate" title={item.work_notes}>
                            {item.work_notes || item.resolution_notes || 'Pending field survey'}
                          </p>
                        </div>
                      </td>

                      {/* Date (IST) */}
                      <td className="py-3 px-4 text-slate-600 text-[11px] font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(item.created_at || item.captured_at)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Quick Update Button */}
                        <button
                          onClick={() => handleOpenUpdateModal(item)}
                          className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <Wrench className="w-3 h-3 text-amber-600" />
                          <span>Update Work</span>
                        </button>

                        {/* PDF Download Button */}
                        <a
                          href={reportApi.getPDFReportUrl(item.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                          <span>PDF</span>
                        </a>

                        {/* View Link */}
                        <Link
                          to={`/admin/inspections/${item.id}`}
                          className="py-1 px-2 text-slate-600 hover:text-slate-900 font-bold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Status Update Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">BBMP Work Status Update</h3>
                  <p className="text-[11px] text-slate-500">Inspection #{selectedItem.id?.slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Change Execution Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'PENDING', label: 'Pending', icon: Clock, color: 'border-yellow-400 bg-yellow-50 text-yellow-800' },
                    { id: 'IN_PROGRESS', label: 'In Progress', icon: Wrench, color: 'border-blue-400 bg-blue-50 text-blue-800' },
                    { id: 'WORK_DONE', label: 'Work Done', icon: CheckCircle2, color: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusVal(st.id)}
                      className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all ${
                        statusVal === st.id
                          ? `${st.color} ring-2 ring-blue-500 font-extrabold shadow-xs`
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 bg-slate-50 dark:bg-slate-800'
                      }`}
                    >
                      <st.icon className="w-4 h-4" />
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Engineer / Contractor Division
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BBMP South Division - Er. Ramesh"
                  value={engineerVal}
                  onChange={(e) => setEngineerVal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Resolution Notes / Work Performed Log
                </label>
                <textarea
                  rows={3}
                  placeholder="Details of repair works, asphalt laying, pothole patching, or scheduled execution dates..."
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" fullWidth onClick={() => setSelectedItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" fullWidth loading={updating}>
                  Save & Update Work Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
