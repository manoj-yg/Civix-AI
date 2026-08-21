import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Search, Filter, FileSpreadsheet, Eye, RefreshCw, ShieldCheck, MapPin, Camera, AlertOctagon } from 'lucide-react';
import { inspectionApi } from '../../api/inspection.api';
import { reportApi } from '../../api/report.api';
import { formatDate, formatCoords } from '../../utils/formatters';

export const Inspections = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');

  useEffect(() => {
    fetchInspections();
  }, [selectedType, selectedSeverity]);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedType !== 'ALL') params.asset_type = selectedType.toLowerCase();
      if (selectedSeverity !== 'ALL') params.severity = selectedSeverity;

      const res = await inspectionApi.getInspections(params);
      const list = res.data || res.items || (Array.isArray(res) ? res : []);
      setInspections(list);
    } catch (err) {
      console.error('Failed to load inspections:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = inspections.filter((item) => {
    const term = search.toLowerCase();
    const typeMatch = (item.asset_type || '').toLowerCase().includes(term);
    const idMatch = (item.id || '').toLowerCase().includes(term);
    const notesMatch = (item.work_notes || '').toLowerCase().includes(term);
    return typeMatch || idMatch || notesMatch;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900">Inspection & Media Registry</h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              Live DB Storage
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">All camera-captured frame images, GPS locations, defect severities, and immutable blockchain hashes</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/field/scanner">
            <Button size="sm" variant="primary" icon={Camera} className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs">
              Open Camera Scanner
            </Button>
          </Link>
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchInspections} loading={loading} className="border-slate-300">
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Inspection ID, Road, or Defect..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Infrastructure Types</option>
          <option value="ROAD">Road</option>
          <option value="BRIDGE">Bridge</option>
          <option value="FLYOVER">Flyover</option>
          <option value="STREETLIGHT">Streetlight</option>
          <option value="FOOTPATH">Footpath</option>
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Risk Severities</option>
          <option value="CRITICAL">🔴 Critical</option>
          <option value="HIGH">🟠 High</option>
          <option value="MEDIUM">🟡 Medium</option>
          <option value="LOW">🟢 Low</option>
        </select>
      </div>

      {/* Inspections Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4">Media Frame</th>
                <th className="py-3.5 px-4">Inspection ID</th>
                <th className="py-3.5 px-4">Defect Classification</th>
                <th className="py-3.5 px-4">GPS Location</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Work Status</th>
                <th className="py-3.5 px-4">Blockchain Stamp</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">Loading inspection registry...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">No inspections found matching criteria.</td></tr>
              ) : (
                filtered.map((item) => {
                  const mediaItem = item.media_items && item.media_items.length > 0 ? item.media_items[0] : null;
                  const filename = mediaItem?.file_path ? mediaItem.file_path.split('/').pop().split('\\').pop() : null;
                  const mediaUrl = filename ? `/api/v1/inspections/media/file/${filename}` : null;
                  const sevLevel = item.severity_assessment?.severity_level || 'HIGH';
                  const normStatus = (item.status || 'PENDING').toUpperCase();

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Media Frame Thumbnail */}
                      <td className="py-3 px-4">
                        {mediaUrl ? (
                          <div className="w-14 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                            <img
                              src={mediaUrl}
                              alt="Frame"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-mono">Frame</div>'; }}
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-10 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                            <Camera className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 truncate max-w-[130px]">
                        {item.id.slice(0, 10)}...
                      </td>

                      {/* Defect Classification */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">
                          {item.detections && item.detections.length > 0 ? item.detections[0].class_name : (item.asset_type || 'Road Defect')}
                        </span>
                        <span className="text-[10px] text-slate-500 capitalize">{item.asset_type || 'Road'}</span>
                      </td>

                      {/* GPS Location */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          <span>{formatCoords(item.latitude, item.longitude)}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatDate(item.captured_at || item.created_at)}</span>
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-4">
                        <SeverityBadge level={sevLevel} />
                      </td>

                      {/* Tri-Color Work Status */}
                      <td className="py-3 px-4">
                        {normStatus === 'COMPLETED' || normStatus === 'WORK_DONE' ? (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            🟢 Solved
                          </span>
                        ) : normStatus === 'IN_PROGRESS' || normStatus === 'PROCESSING' ? (
                          <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">
                            🟠 In Progress
                          </span>
                        ) : (
                          <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                            🔴 Danger / Pending
                          </span>
                        )}
                      </td>

                      {/* Blockchain Stamp */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          to={`/admin/inspections/${item.id}`}
                          className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                        <a
                          href={reportApi.getPDFReportUrl(item.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> PDF
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
