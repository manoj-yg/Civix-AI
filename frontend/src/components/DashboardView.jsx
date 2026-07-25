import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Layers, 
  Search, 
  Download, 
  MapPin, 
  ExternalLink, 
  RefreshCw,
  Filter,
  Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function DashboardView() {
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, potholes: 0, cracks: 0, resolved: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [damageFilter, setDamageFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/incidents', {
        params: { search, status: statusFilter, damage_type: damageFilter }
      });
      setIncidents(res.data.incidents || []);
      setMetrics(res.data.metrics || { total: 0, potholes: 0, cracks: 0, resolved: 0 });
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [search, statusFilter, damageFilter]);

  const handleStatusChange = async (incId, newStatus) => {
    try {
      setUpdatingId(incId);
      await axios.patch(`/api/incidents/${incId}/status`, { status: newStatus });
      fetchIncidents();
    } catch (err) {
      alert('Failed to update incident status');
    } finally {
      setUpdatingId(null);
    }
  };

  const pieData = [
    { name: 'Potholes', value: metrics.potholes, color: '#F43F5E' },
    { name: 'Cracks', value: metrics.cracks, color: '#F59E0B' },
    { name: 'Resolved', value: metrics.resolved, color: '#10B981' }
  ];

  const validMapIncidents = incidents.filter(inc => inc.latitude && inc.longitude);
  const defaultCenter = validMapIncidents.length > 0 
    ? [validMapIncidents[0].latitude, validMapIncidents[0].longitude] 
    : [12.971599, 77.594563];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Incident Monitoring Portal
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Real-time geospatial hazard tracking, incident resolution workflow & high-precision mapping
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchIncidents}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <a
            href="/api/export/csv"
            download
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </a>
          <a
            href="/api/export/json"
            download
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 transition"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Total Reported</span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-1">{metrics.total}</div>
          <span className="text-xs text-slate-400 mt-1 inline-block">Active incident records</span>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 text-rose-400 mb-2">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Potholes</span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-1">{metrics.potholes}</div>
          <span className="text-xs text-slate-400 mt-1 inline-block">High severity road holes</span>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 text-amber-400 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Crack Defects</span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-1">{metrics.cracks}</div>
          <span className="text-xs text-slate-400 mt-1 inline-block">Surface & structural cracks</span>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Resolved</span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-1">{metrics.resolved}</div>
          <span className="text-xs text-slate-400 mt-1 inline-block">Repaired & verified</span>
        </div>
      </div>

      {/* Map & Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Modern Leaflet Map */}
        <div className="lg:col-span-8 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col h-[480px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm text-slate-200">High-Precision Geospatial Map</h3>
            </div>
            <span className="text-xs text-slate-400">{validMapIncidents.length} Geotagged Locations</span>
          </div>
          <div className="flex-1 w-full rounded-xl overflow-hidden relative">
            {validMapIncidents.length > 0 ? (
              <MapContainer 
                center={defaultCenter} 
                zoom={12} 
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                {validMapIncidents.map((inc) => (
                  <React.Fragment key={inc.id}>
                    <Circle 
                      center={[inc.latitude, inc.longitude]} 
                      radius={150}
                      pathOptions={{ color: inc.status === 'Resolved' ? '#10B981' : '#F43F5E', fillColor: inc.status === 'Resolved' ? '#10B981' : '#F43F5E', fillOpacity: 0.2 }} 
                    />
                    <Marker position={[inc.latitude, inc.longitude]}>
                      <Popup>
                        <div className="text-xs space-y-1.5 p-1">
                          <div className="font-bold text-blue-400">{inc.id} ({inc.status})</div>
                          <div><strong>Detected Damage:</strong> {Array.isArray(inc.damage_types) ? inc.damage_types.join(', ') : inc.damage_types}</div>
                          <div><strong>Location:</strong> {inc.location_desc}</div>
                          <div><strong>Source:</strong> {inc.source}</div>
                          {inc.google_maps_url && (
                            <a 
                              href={inc.google_maps_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-cyan-400 hover:underline mt-1 font-semibold"
                            >
                              Open Google Maps <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                ))}
              </MapContainer>
            ) : (
              <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-500 text-sm">
                No GPS coordinates available for current filter
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Chart */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col h-[480px]">
          <h3 className="font-semibold text-sm text-slate-200 mb-2">Damage Category Distribution</h3>
          <div className="flex-1 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#FFF' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around pt-3 border-t border-slate-800/80">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                <span className="text-slate-300">{d.name}:</span>
                <span className="font-bold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive Filter Controls & Records Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, Location or Source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-800 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-dark-800 border border-slate-700/60 px-3 py-1.5 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none font-medium cursor-pointer"
              >
                <option value="All" className="bg-dark-800">All Statuses</option>
                <option value="Reported" className="bg-dark-800">Reported</option>
                <option value="In Progress" className="bg-dark-800">In Progress</option>
                <option value="Resolved" className="bg-dark-800">Resolved</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-dark-800 border border-slate-700/60 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-slate-400">Damage:</span>
              <select
                value={damageFilter}
                onChange={(e) => setDamageFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none font-medium cursor-pointer"
              >
                <option value="All" className="bg-dark-800">All Categories</option>
                <option value="Potholes" className="bg-dark-800">Potholes</option>
                <option value="Alligator Crack" className="bg-dark-800">Alligator Crack</option>
                <option value="Longitudinal Crack" className="bg-dark-800">Longitudinal Crack</option>
                <option value="Transverse Crack" className="bg-dark-800">Transverse Crack</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsive Incident Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-dark-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Incident ID</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Detected Damage</th>
                <th className="py-3.5 px-4">Location Description</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-dark-900/40">
              {incidents.length > 0 ? (
                incidents.map((inc) => {
                  const damageStr = Array.isArray(inc.damage_types) 
                    ? inc.damage_types.join(', ') 
                    : inc.damage_types || 'N/A';

                  return (
                    <tr key={inc.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">{inc.id}</td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{inc.timestamp}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                          {inc.source}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">{damageStr}</td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                        {inc.location_desc}
                        {inc.google_maps_url && (
                          <a
                            href={inc.google_maps_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-2 text-cyan-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
                          >
                            <MapPin className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          inc.status === 'Resolved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : inc.status === 'In Progress'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <select
                          disabled={updatingId === inc.id}
                          value={inc.status}
                          onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                          className="bg-dark-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="Reported">Reported</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No incidents match your current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
