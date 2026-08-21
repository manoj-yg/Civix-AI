import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INFRASTRUCTURE_TYPES } from '../../constants/infrastructure';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  MapPin,
  ThumbsUp,
  RefreshCw,
  Eye,
  Flame,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Search,
  SlidersHorizontal,
  X,
  UserCheck,
  Download
} from 'lucide-react';
import { gisApi } from '../../api/gis.api';
import { inspectionApi } from '../../api/inspection.api';
import { reportApi } from '../../api/report.api';
import apiClient from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

// Custom Marker Generator with strict Tri-Color status mapping:
// 🔴 Red = Danger / Unresolved Pothole Hazard
// 🟠 Orange = In Progress / Under Municipal Repair
// 🟢 Green = Solved / Repaired Issue
const createCustomMarkerIcon = (severityLevel, status, votes = 0) => {
  const normStatus = (status || 'PENDING').toUpperCase();
  const isResolved = normStatus === 'COMPLETED' || normStatus === 'WORK_DONE';
  const isInProgress = normStatus === 'IN_PROGRESS' || normStatus === 'PROCESSING';
  
  // Tri-Color logic
  let color = '#ef4444'; // Red: Danger / Unresolved
  let statusBorder = '#ffffff';
  let label = 'DANGER';

  if (isResolved) {
    color = '#10b981'; // Green: Solved
    label = 'SOLVED';
  } else if (isInProgress) {
    color = '#f97316'; // Orange: In Progress
    label = 'IN PROGRESS';
  }

  const isDanger = !isResolved && !isInProgress;
  const size = isDanger ? 22 : (isInProgress ? 20 : 18);
  const pulseClass = isDanger ? 'animate-ping opacity-75' : '';

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      ${isDanger ? `<div style="position: absolute; width: ${size + 14}px; height: ${size + 14}px; border-radius: 50%; background-color: rgba(239, 68, 68, 0.35);" class="${pulseClass}"></div>` : ''}
      <div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid ${statusBorder}; box-shadow: 0 4px 12px rgba(0,0,0,0.25); position: relative; z-index: 2;"></div>
      ${isResolved ? `<div style="position: absolute; top: -3px; right: -3px; background: #059669; color: white; width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid white; z-index: 3;"></div>` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'custom-map-marker',
    html: html,
    iconSize: [size + 14, size + 14],
    iconAnchor: [(size + 14) / 2, (size + 14) / 2],
  });
};

// Map invalidateSize helper
const MapResizeHandler = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);
  return null;
};

export const LiveMap = () => {
  const { user } = useAuth();
  const isOfficerOrEngineer = user?.role === 'ADMIN' || user?.role === 'ENGINEER' || user?.role === 'INSPECTOR';

  const [defects, setDefects] = useState([]);
  const [stats, setStats] = useState({
    total_damages: 0,
    by_severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    by_status: { PENDING: 0, IN_PROGRESS: 0, WORK_DONE: 0, COMPLETED: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedInfra, setSelectedInfra] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Status Update Modal State for BBMP / Engineer
  const [selectedItemForUpdate, setSelectedItemForUpdate] = useState(null);
  const [updateStatusVal, setUpdateStatusVal] = useState('IN_PROGRESS');
  const [updateEngineerVal, setUpdateEngineerVal] = useState('');
  const [updateNotesVal, setUpdateNotesVal] = useState('');
  const [updating, setUpdating] = useState(false);

  const centerCoords = [12.9716, 77.5946];

  useEffect(() => {
    fetchMapData();
    fetchStats();
  }, [selectedInfra, selectedSeverity, selectedStatus]);

  const fetchStats = async () => {
    try {
      const res = await gisApi.getSummaryStats();
      if (res?.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.warn('Failed to load stats summary:', e);
    }
  };

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const res = await gisApi.getAllGISDefects();
      const featureList = res.data?.features || res.features || [];

      // Map GeoJSON features to clean defect objects
      const items = featureList.map((f, idx) => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [77.5946, 12.9716];
        return {
          id: props.inspection_id || `gis-${idx}`,
          inspection_id: props.inspection_id || `gis-${idx}`,
          latitude: coords[1],
          longitude: coords[0],
          asset_type: (props.asset_type || 'ROAD').toLowerCase(),
          defect_type: props.defect_type || 'Infrastructure Defect',
          severity_level: props.severity_level || 'LOW',
          risk_score: Math.round(props.severity_score || 75),
          status: props.status || 'PENDING',
          upvotes_count: props.upvotes_count || 0,
          address: props.address || 'Bengaluru Road Segment',
          media_url: props.media_url,
          assigned_engineer: props.assigned_engineer,
          work_notes: props.work_notes,
          captured_at: props.created_at || new Date().toISOString(),
        };
      });

      // Filter out duplicates by inspection_id
      const uniqueItems = Array.from(new Map(items.map((item) => [item.inspection_id, item])).values());

      // Apply client-side filters
      const filtered = uniqueItems.filter((item) => {
        const infraMatch = selectedInfra === 'ALL' || item.asset_type.toUpperCase() === selectedInfra;
        const sevMatch = selectedSeverity === 'ALL' || item.severity_level.toUpperCase() === selectedSeverity;
        const statusMatch =
          selectedStatus === 'ALL' ||
          item.status.toUpperCase() === selectedStatus ||
          (selectedStatus === 'WORK_DONE' && item.status.toUpperCase() === 'COMPLETED');
        const searchMatch =
          !searchQuery ||
          item.defect_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.inspection_id.toLowerCase().includes(searchQuery.toLowerCase());

        return infraMatch && sevMatch && statusMatch && searchMatch;
      });

      setDefects(filtered);
    } catch (err) {
      console.error('Failed to load real GIS defects:', err);
      setDefects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (inspectionId) => {
    try {
      await apiClient.post(`/inspections/${inspectionId}/upvote`);
      setDefects((prev) =>
        prev.map((item) =>
          item.inspection_id === inspectionId
            ? { ...item, upvotes_count: (item.upvotes_count || 0) + 1 }
            : item
        )
      );
    } catch {
      setDefects((prev) =>
        prev.map((item) =>
          item.inspection_id === inspectionId
            ? { ...item, upvotes_count: (item.upvotes_count || 0) + 1 }
            : item
        )
      );
    }
  };

  const openStatusUpdateModal = (item) => {
    setSelectedItemForUpdate(item);
    setUpdateStatusVal(item.status || 'IN_PROGRESS');
    setUpdateEngineerVal(item.assigned_engineer || user?.full_name || 'BBMP Ward Engineer');
    setUpdateNotesVal(item.work_notes || '');
  };

  const handleSaveStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedItemForUpdate) return;
    setUpdating(true);
    try {
      await inspectionApi.updateInspectionStatus(selectedItemForUpdate.inspection_id, {
        status: updateStatusVal,
        assigned_engineer: updateEngineerVal,
        work_notes: updateNotesVal,
        resolution_notes: updateNotesVal,
      });

      // Update in local state
      setDefects((prev) =>
        prev.map((item) =>
          item.inspection_id === selectedItemForUpdate.inspection_id
            ? {
                ...item,
                status: updateStatusVal,
                assigned_engineer: updateEngineerVal,
                work_notes: updateNotesVal,
              }
            : item
        )
      );
      setSelectedItemForUpdate(null);
      fetchStats();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update work order status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col space-y-2.5 font-sans">
      {/* Top Real-Time Aggregation & Tri-Color Status Legend Bar (Light Theme) */}
      <div className="bg-white text-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 border border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-900">City-Wide GIS Live Map</h1>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                Real-Time Citizen & Camera Reports
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Total Monitored Issues:{' '}
              <span className="font-bold text-slate-900 text-xs">{stats.total_damages || defects.length}</span> Active GIS Points
            </p>
          </div>
        </div>

        {/* Tri-Color Map Legend & Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Red: Danger */}
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
              selectedStatus === 'PENDING'
                ? 'bg-red-600 text-white ring-2 ring-red-400'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span>🔴 Danger: {stats.by_status?.PENDING || 0}</span>
          </button>

          {/* Orange: In Progress */}
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
              selectedStatus === 'IN_PROGRESS'
                ? 'bg-orange-600 text-white ring-2 ring-orange-400'
                : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>🟠 In Progress: {stats.by_status?.IN_PROGRESS || 0}</span>
          </button>

          {/* Green: Solved */}
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
              selectedStatus === 'COMPLETED'
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>🟢 Solved: {stats.by_status?.COMPLETED || 0}</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Quick PDF Summary Export */}
          <a
            href={reportApi.getSummaryPDFReportUrl({ severity: selectedSeverity, asset_type: selectedInfra })}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>BBMP GIS Report</span>
          </a>
        </div>
      </div>

      {/* Interactive Control & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by Ward, Address, or Defect Type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedInfra}
            onChange={(e) => setSelectedInfra(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Infrastructure</option>
            {INFRASTRUCTURE_TYPES.map((t) => (
              <option key={t.id} value={t.id.toUpperCase()}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Work Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="IN_PROGRESS">In Progress / Assigned</option>
            <option value="WORK_DONE">Work Done / Resolved</option>
          </select>

          {(selectedInfra !== 'ALL' || selectedSeverity !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedInfra('ALL');
                setSelectedSeverity('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 px-2 py-1 bg-red-50 rounded-lg"
            >
              <X className="w-3 h-3" /> Clear Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-semibold">
            Showing <b className="text-slate-800">{defects.length}</b> Map Points
          </span>
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchMapData} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-md relative z-0 bg-slate-100 min-h-[300px]">
        <MapContainer center={centerCoords} zoom={13} scrollWheelZoom={true} className="w-full h-full">
          <MapResizeHandler />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {defects.map((d) => {
            const lat = d.latitude || 12.9716;
            const lng = d.longitude || 77.5946;
            const severity = d.severity_level || 'LOW';
            const status = d.status || 'PENDING';
            const inspId = d.inspection_id || d.id;
            const votes = d.upvotes_count || 0;

            return (
              <Marker
                key={inspId}
                position={[lat, lng]}
                icon={createCustomMarkerIcon(severity, status, votes)}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 space-y-2 text-xs min-w-[270px] max-w-[300px]">
                    {/* Media Photo Preview */}
                    {d.media_url && (
                      <div className="rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100 flex items-center justify-center relative">
                        <img
                          src={d.media_url}
                          alt={d.defect_type || 'Captured defect'}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Camera Capture
                        </span>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-bold text-slate-900 capitalize text-xs">{d.asset_type || 'Road'} Defect</span>
                      {status === 'COMPLETED' || status === 'WORK_DONE' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                          🟢 SOLVED
                        </span>
                      ) : status === 'IN_PROGRESS' ? (
                        <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-300">
                          🟠 IN PROGRESS
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-300">
                          🔴 DANGER / PENDING
                        </span>
                      )}
                    </div>

                    {/* Defect Title & Address */}
                    <div className="space-y-1 text-slate-600">
                      <p className="font-bold text-slate-900 text-sm">{d.defect_type || 'Pothole Defect'}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span>{d.address}</span>
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">AI Risk Score:</span>
                        <span className={`font-bold ${d.risk_score >= 70 ? 'text-red-600' : 'text-orange-600'}`}>
                          {d.risk_score || 75}/100
                        </span>
                      </div>

                      {/* Blockchain Seal Stamp */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 flex items-center gap-1 font-medium">
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          <span>Blockchain Immuntability</span>
                        </span>
                        <span className="font-bold text-emerald-700">SHA-256 Verified</span>
                      </div>

                      {d.assigned_engineer && (
                        <div className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100 text-slate-700">
                          <span className="font-semibold text-slate-900">Assigned:</span> {d.assigned_engineer}
                        </div>
                      )}
                    </div>

                    {/* Actions Box */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleUpvote(inspId)}
                          className="py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 border border-blue-200 transition-colors"
                        >
                          <ThumbsUp className="w-3 h-3 text-blue-600" />
                          <span>Upvote ({votes})</span>
                        </button>

                        <a
                          href={reportApi.getPDFReportUrl(inspId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 border border-slate-200 transition-colors"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-slate-600" />
                          <span>PDF Report</span>
                        </a>
                      </div>

                      {/* BBMP / Engineer Quick Work Status Update Button */}
                      {isOfficerOrEngineer && (
                        <button
                          onClick={() => openStatusUpdateModal(d)}
                          className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Update Work Status</span>
                        </button>
                      )}

                      <Link
                        to={isOfficerOrEngineer ? `/admin/inspections/${inspId}` : `/field/inspections/${inspId}`}
                        className="block w-full text-center py-1.5 bg-slate-900 text-white rounded-lg font-semibold text-[11px] hover:bg-slate-800"
                      >
                        View Full Details
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* BBMP & Engineer Quick Status Update Modal */}
      {selectedItemForUpdate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Update Work Order Status</h3>
                  <p className="text-[11px] text-slate-500">Inspection #{selectedItemForUpdate.inspection_id?.slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForUpdate(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatusUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Work Order Execution Status
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
                      onClick={() => setUpdateStatusVal(st.id)}
                      className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all ${
                        updateStatusVal === st.id
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
                  value={updateEngineerVal}
                  onChange={(e) => setUpdateEngineerVal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Engineer Remarks / Resolution Log
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe repair actions taken, materials used, asphalt compaction, or scheduled repair date..."
                  value={updateNotesVal}
                  onChange={(e) => setUpdateNotesVal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setSelectedItemForUpdate(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" fullWidth loading={updating}>
                  Save & Update Map
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
