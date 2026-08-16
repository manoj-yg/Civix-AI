import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Search, Filter, FileSpreadsheet, Eye, RefreshCw } from 'lucide-react';
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
    return typeMatch || idMatch;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Field Inspection Registry</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">All captured infrastructure defects and multi-model AI classifications</p>
        </div>
        <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchInspections} loading={loading}>
          Refresh List
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Inspection ID or Infrastructure..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
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
            className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
          >
            <option value="ALL">All Risk Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </Card>

      {/* Inspections Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Inspection ID</th>
                <th className="py-3 px-4">Asset Type</th>
                <th className="py-3 px-4">Location (GPS)</th>
                <th className="py-3 px-4">Date Captured</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading inspection registry...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">No inspections found matching criteria.</td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{item.id}</td>
                    <td className="py-3 px-4 capitalize font-semibold">{item.asset_type || 'Road'}</td>
                    <td className="py-3 px-4 text-slate-500">{formatCoords(item.latitude, item.longitude)}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(item.captured_at)}</td>
                    <td className="py-3 px-4">
                      <SeverityBadge level={item.severity_assessment?.severity_level || 'LOW'} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link to={`/admin/inspections/${item.id}`} className="text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                      <a href={reportApi.getPDFReportUrl(item.id)} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-700 font-semibold inline-flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5" /> PDF
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
