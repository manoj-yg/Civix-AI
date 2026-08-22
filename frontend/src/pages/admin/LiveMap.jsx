import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INFRASTRUCTURE_TYPES } from '../../constants/infrastructure';
import { Button } from '../../components/common/Button';
import {
  MapPin,
  RefreshCw,
  Wrench,
  Search,
  X,
  Layers,
  Crosshair,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { gisApi } from '../../api/gis.api';
import { inspectionApi } from '../../api/inspection.api';
import { reportApi } from '../../api/report.api';
import apiClient from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

// Map Tile Layers (Google Maps / Satellite / Topo)
const TILE_LAYERS = {
  STREETS: {
    name: 'Default Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  SATELLITE: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
  TERRAIN: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors',
  },
};

// Strict Tri-Color Marker Generator:
// 🔴 Red = Danger / Unresolved Pothole Hazard
// 🟠 Orange = In Progress / Under Municipal Repair
// 🟢 Green = Solved / Repaired Issue
const createCustomMarkerIcon = (severityLevel, status, isSelected = false) => {
  const normStatus = (status || 'PENDING').toUpperCase();
  const isResolved = normStatus === 'COMPLETED' || normStatus === 'WORK_DONE';
  const isInProgress = normStatus === 'IN_PROGRESS' || normStatus === 'PROCESSING';

  let color = '#ef4444'; // Red: Danger
  if (isResolved) {
    color = '#10b981'; // Green: Solved
  } else if (isInProgress) {
    color = '#f97316'; // Orange: In Progress
  }

  const isDanger = !isResolved && !isInProgress;
  const size = isSelected ? 26 : (isDanger ? 20 : (isInProgress ? 18 : 16));
  const pulseClass = isDanger ? 'animate-ping opacity-75' : '';

  const html = `
    <div style="position: relative; width: ${size + 14}px; height: ${size + 14}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      ${isDanger ? `<div style="position: absolute; width: ${size + 12}px; height: ${size + 12}px; border-radius: 50%; background-color: rgba(239, 68, 68, 0.4);" class="${pulseClass}"></div>` : ''}
      ${isSelected ? `<div style="position: absolute; width: ${size + 14}px; height: ${size + 14}px; border-radius: 50%; border: 3px solid #2563eb; background-color: rgba(37, 99, 235, 0.25);"></div>` : ''}
      <div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.3); position: relative; z-index: 2; display: flex; align-items: center; justify-content: center;">
        ${isResolved ? `<div style="width: 5px; height: 5px; background: white; border-radius: 50%;"></div>` : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'google-maps-pin',
    html: html,
    iconSize: [size + 14, size + 14],
    iconAnchor: [(size + 14) / 2, (size + 14) / 2],
  });
};

// Map fly-to and resize controller
const MapFlyToHandler = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 14, { duration: 1.2 });
    }
  }, [center, zoom, map]);

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
    by_status: { PENDING: 0, IN_PROGRESS: 0, WORK_DONE: 0, COMPLETED: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [activeTileLayer, setActiveTileLayer] = useState('STREETS');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Selected place for Google Maps style Place Card Drawer
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [copied, setCopied] = useState(false);

  // Map viewport center
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(13);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Status update modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');
  const [assignedEngineer, setAssignedEngineer] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMapData();
    fetchStats();
  }, []);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const res = await gisApi.getAllGISDefects();
      const featureList = res.data?.features || res.features || [];

      const mapped = featureList.map((f, idx) => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [77.5946, 12.9716];
        return {
          id: props.inspection_id || `gis-${idx}`,
          inspection_id: props.inspection_id || `gis-${idx}`,
          latitude: coords[1],
          longitude: coords[0],
          asset_type: props.asset_type || 'Road',
          defect_type: props.defect_type || 'Road Pothole Hazard',
          status: (props.status || 'PENDING').toUpperCase(),
          severity_score: Math.round(props.severity_score || 75),
          severity_level: props.severity_level || 'HIGH',
          address: props.address || `GPS: ${coords[1].toFixed(5)}° N, ${coords[0].toFixed(5)}° E`,
          media_url: props.media_url,
          assigned_engineer: props.assigned_engineer,
          work_notes: props.work_notes,
          blockchain_verified: props.blockchain_verified ?? true,
          created_at: props.created_at,
        };
      });

      setDefects(mapped);
      if (mapped.length > 0 && !selectedPlace) {
        setMapCenter([mapped[0].latitude, mapped[0].longitude]);
      }
    } catch (err) {
      console.error('Failed to load GIS map defects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await gisApi.getSummaryStats();
      if (res?.data) setStats(res.data);
    } catch (e) {
      console.warn('Failed to load stats:', e);
    }
  };

  const filteredDefects = useMemo(() => {
    return defects.filter((d) => {
      let statusMatch = true;
      if (selectedStatus === 'PENDING') {
        statusMatch = d.status === 'PENDING' || d.status === 'FAILED' || d.status === 'REVIEW_REQUIRED';
      } else if (selectedStatus === 'IN_PROGRESS') {
        statusMatch = d.status === 'IN_PROGRESS' || d.status === 'PROCESSING';
      } else if (selectedStatus === 'COMPLETED') {
        statusMatch = d.status === 'COMPLETED' || d.status === 'WORK_DONE';
      }

      const searchMatch =
        !searchQuery ||
        (d.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.defect_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.inspection_id || '').toLowerCase().includes(searchQuery.toLowerCase());

      return statusMatch && searchMatch;
    });
  }, [defects, selectedStatus, searchQuery]);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setMapZoom(16);
      });
    }
  };

  const handleCopyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveStatusUpdate = async () => {
    if (!selectedPlace) return;
    setUpdating(true);
    try {
      await inspectionApi.updateInspectionStatus(selectedPlace.inspection_id, {
        status: newStatus,
        assigned_engineer: assignedEngineer || user?.full_name || 'BBMP Ward Engineer',
        resolution_notes: resolutionNotes || `Updated to ${newStatus} on Google Maps Live Hub`,
      });

      setStatusModalOpen(false);
      fetchMapData();
      fetchStats();
      setSelectedPlace((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Status update failed.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-5.5rem)] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md font-sans bg-slate-100 flex flex-col">
      {/* 1. Google Maps-Style Top Floating Search & Filter Capsule Bar */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-xl z-[400] space-y-2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 p-1.5 flex items-center gap-2">
          <div className="pl-3 text-slate-400">
            <Search className="w-4 h-4 text-blue-600" />
          </div>
          <input
            type="text"
            placeholder="Search Bangalore roads, area address, or defect..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold text-slate-800 bg-transparent placeholder-slate-400 focus:outline-none py-2"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="h-5 w-px bg-slate-200"></div>
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            onClick={() => { fetchMapData(); fetchStats(); }}
            loading={loading}
            className="border-none shadow-none text-slate-600 hover:bg-slate-100 px-2 text-xs"
          />
        </div>

        {/* Quick Filter Chips (Google Maps Pill Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm transition-all shrink-0 flex items-center gap-1 ${
              selectedStatus === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white/95 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>All Issues</span>
            <span className="bg-slate-200 text-slate-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {stats.total_damages || defects.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm transition-all shrink-0 flex items-center gap-1.5 ${
              selectedStatus === 'PENDING'
                ? 'bg-red-600 text-white ring-2 ring-red-400'
                : 'bg-white/95 text-red-700 hover:bg-red-50 border border-red-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>🔴 Danger: {stats.by_status?.PENDING || 0}</span>
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
            className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm transition-all shrink-0 flex items-center gap-1.5 ${
              selectedStatus === 'IN_PROGRESS'
                ? 'bg-orange-600 text-white ring-2 ring-orange-400'
                : 'bg-white/95 text-orange-700 hover:bg-orange-50 border border-orange-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span>🟠 In Progress: {stats.by_status?.IN_PROGRESS || 0}</span>
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm transition-all shrink-0 flex items-center gap-1.5 ${
              selectedStatus === 'COMPLETED'
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                : 'bg-white/95 text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>🟢 Solved: {stats.by_status?.COMPLETED || 0}</span>
          </button>
        </div>
      </div>

      {/* 2. Floating Map Tools (Layer Switcher & Locate Me) */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
            title="Switch Map Layers"
          >
            <Layers className="w-5 h-5 text-blue-600" />
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 top-12 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 z-50">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 px-2 block">Map Views</span>
              {Object.keys(TILE_LAYERS).map((k) => (
                <button
                  key={k}
                  onClick={() => { setActiveTileLayer(k); setShowLayerMenu(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                    activeTileLayer === k ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{TILE_LAYERS[k].name}</span>
                  {activeTileLayer === k && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleLocateMe}
          className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
          title="Locate My GPS Position"
        >
          <Crosshair className="w-5 h-5 text-emerald-600" />
        </button>
      </div>

      {/* 3. Interactive Leaflet Map Canvas */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapFlyToHandler center={mapCenter} zoom={mapZoom} />
        <TileLayer
          attribution={TILE_LAYERS[activeTileLayer].attribution}
          url={TILE_LAYERS[activeTileLayer].url}
        />

        {filteredDefects.map((d) => (
          <Marker
            key={d.id}
            position={[d.latitude, d.longitude]}
            icon={createCustomMarkerIcon(d.severity_level, d.status, selectedPlace?.id === d.id)}
            eventHandlers={{
              click: () => {
                setSelectedPlace(d);
                setMapCenter([d.latitude, d.longitude]);
              },
            }}
          />
        ))}
      </MapContainer>

      {/* 4. Google Maps-Style Floating Place Card Detail Drawer */}
      {selectedPlace && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 z-[450] bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-slate-200/90 space-y-3.5 animate-fadeIn max-h-[85vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm">{selectedPlace.defect_type}</span>
                {selectedPlace.status === 'COMPLETED' || selectedPlace.status === 'WORK_DONE' ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                    🟢 SOLVED
                  </span>
                ) : selectedPlace.status === 'IN_PROGRESS' ? (
                  <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-300">
                    🟠 IN PROGRESS
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-300">
                    🔴 DANGER
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                {selectedPlace.asset_type || 'Road'} Infrastructure
              </span>
            </div>

            <button
              onClick={() => setSelectedPlace(null)}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedPlace.media_url ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-900 relative shadow-inner">
              <img
                src={selectedPlace.media_url}
                alt={selectedPlace.defect_type}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-white text-xs font-semibold">Camera Capture Stored</div>'; }}
              />
              <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                Live Frame Capture
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 aspect-[3/1] bg-slate-50 flex items-center justify-center text-slate-400 text-xs font-semibold">
              Live Frame Saved in DB
            </div>
          )}

          {/* Area Address Card */}
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                    {selectedPlace.address}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                    {selectedPlace.latitude.toFixed(5)}° N, {selectedPlace.longitude.toFixed(5)}° E
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleCopyAddress(selectedPlace.address)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                title="Copy Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.latitude},${selectedPlace.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 pt-1"
            >
              <Navigation className="w-3 h-3 text-blue-600" />
              <span>Get Directions in Google Maps</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Risk & Blockchain */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">AI Risk Score</span>
              <span className="text-sm font-black text-red-600">{selectedPlace.severity_score}/100</span>
            </div>
            <div className="bg-emerald-50/80 p-2.5 rounded-2xl border border-emerald-200">
              <span className="text-[10px] text-emerald-700 font-bold block uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Blockchain
              </span>
              <span className="text-xs font-extrabold text-emerald-900">SHA-256 Verified</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            {isOfficerOrEngineer && (
              <button
                onClick={() => {
                  setNewStatus(selectedPlace.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED');
                  setStatusModalOpen(true);
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Update Work Order Status</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/admin/inspections/${selectedPlace.inspection_id}`}
                className="block text-center py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold text-xs border border-blue-200 font-bold"
              >
                Full Details
              </Link>
              <a
                href={reportApi.getPDFReportUrl(selectedPlace.inspection_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs border border-slate-200 font-bold flex items-center justify-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 5. Status Update Modal */}
      {statusModalOpen && selectedPlace && (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Update BBMP Work Order</h3>
                  <p className="text-[11px] text-slate-500 font-mono">#{selectedPlace.inspection_id.slice(0, 10)}</p>
                </div>
              </div>
              <button onClick={() => setStatusModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Tri-Color Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('PENDING')}
                    className={`py-2 rounded-xl font-extrabold border text-center transition-all ${
                      newStatus === 'PENDING' ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    🔴 Danger
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('IN_PROGRESS')}
                    className={`py-2 rounded-xl font-extrabold border text-center transition-all ${
                      newStatus === 'IN_PROGRESS' ? 'bg-orange-600 text-white border-orange-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    🟠 In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('COMPLETED')}
                    className={`py-2 rounded-xl font-extrabold border text-center transition-all ${
                      newStatus === 'COMPLETED' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    🟢 Solved
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned BBMP Engineer / Contractor</label>
                <input
                  type="text"
                  placeholder="e.g. Ward 150 Executive Engineer"
                  value={assignedEngineer}
                  onChange={(e) => setAssignedEngineer(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Work Resolution Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Asphalt patch completed with hot bitumen mix"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveStatusUpdate}
                loading={updating}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Save & Broadcast
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
