import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INFRASTRUCTURE_TYPES } from '../../constants/infrastructure';
import { SeverityBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { MapPin, ThumbsUp, RefreshCw, Eye, Flame } from 'lucide-react';
import { gisApi } from '../../api/gis.api';
import apiClient from '../../api/axios';

const createCustomMarkerIcon = (severityLevel, votes = 0) => {
  const colorMap = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#f97316',
    CRITICAL: '#dc2626',
  };
  const color = colorMap[severityLevel?.toUpperCase()] || '#10b981';
  const size = votes >= 10 ? 18 : 14;

  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.25);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Map invalidateSize helper component for zero responsive glitches
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
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInfra, setSelectedInfra] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');

  const centerCoords = [12.9716, 77.5946];

  useEffect(() => {
    fetchMapData();
  }, [selectedInfra, selectedSeverity]);

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
          upvotes_count: props.upvotes_count || 0,
          captured_at: props.created_at || new Date().toISOString(),
        };
      });

      // Filter out duplicates by inspection_id
      const uniqueItems = Array.from(new Map(items.map(item => [item.inspection_id, item])).values());

      // Apply client-side filters if selected
      const filtered = uniqueItems.filter(item => {
        const infraMatch = selectedInfra === 'ALL' || item.asset_type.toUpperCase() === selectedInfra;
        const sevMatch = selectedSeverity === 'ALL' || item.severity_level.toUpperCase() === selectedSeverity;
        return infraMatch && sevMatch;
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
      setDefects(prev =>
        prev.map(item =>
          item.inspection_id === inspectionId
            ? { ...item, upvotes_count: (item.upvotes_count || 0) + 1 }
            : item
        )
      );
    } catch {
      setDefects(prev =>
        prev.map(item =>
          item.inspection_id === inspectionId
            ? { ...item, upvotes_count: (item.upvotes_count || 0) + 1 }
            : item
        )
      );
    }
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-3 font-sans">
      {/* Crisp Light Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">City-Wide Live GPS Issue Map</h2>
            <p className="text-[11px] text-slate-500">Real database records from Neon Cloud PostGIS</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedInfra}
            onChange={(e) => setSelectedInfra(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Infrastructure Types</option>
            {INFRASTRUCTURE_TYPES.map((t) => (
              <option key={t.id} value={t.id.toUpperCase()}>{t.name}</option>
            ))}
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Risk Severities</option>
            <option value="CRITICAL">Critical Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>

          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchMapData} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-md relative z-0 bg-slate-100 min-h-[300px]">
        <MapContainer
          center={centerCoords}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <MapResizeHandler />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {defects.map((d) => {
            const lat = d.latitude || 12.9716;
            const lng = d.longitude || 77.5946;
            const severity = d.severity_level || 'LOW';
            const inspId = d.inspection_id || d.id;
            const votes = d.upvotes_count || 0;

            return (
              <Marker
                key={inspId}
                position={[lat, lng]}
                icon={createCustomMarkerIcon(severity, votes)}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 space-y-2 text-xs min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-bold text-slate-900 capitalize">{d.asset_type || 'Road'} Issue</span>
                      <SeverityBadge level={severity} />
                    </div>

                    <div className="space-y-1 text-slate-600">
                      <p className="font-bold text-slate-900 text-sm">{d.defect_type || 'Pothole Defect'}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">AI Risk Score:</span>
                        <span className="font-bold text-red-600">{d.risk_score || 85}/100</span>
                      </div>
                      
                      {votes >= 10 && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Flame className="w-3.5 h-3.5 text-amber-600" />
                          <span>Community High Priority ({votes} Upvotes)</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <button
                        onClick={() => handleUpvote(inspId)}
                        className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 transition-colors"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
                        <span>Upvote Issue ({votes})</span>
                      </button>

                      <Link
                        to={`/field/inspections/${inspId}`}
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
    </div>
  );
};
