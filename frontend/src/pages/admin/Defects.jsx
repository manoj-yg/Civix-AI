import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { defectApi } from '../../api/defect.api';
import { formatDate } from '../../utils/formatters';

export const Defects = () => {
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchDefects();
  }, [statusFilter]);

  const fetchDefects = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
      const res = await defectApi.getDefects(params);
      const list = res.data || res.items || (Array.isArray(res) ? res : []);
      setDefects(list);
    } catch (err) {
      console.error('Failed to load defects:', err);
      setDefects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await defectApi.updateDefectStatus(id, newStatus);
      fetchDefects();
    } catch (err) {
      console.error('Failed to update defect status:', err);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Defect Lifecycle Management</h1>
        <p className="text-xs text-slate-500">Review real database defect classifications from Detection $\rightarrow$ Resolution</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {['ALL', 'NEW', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors ${
              statusFilter === st
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Defects Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Defect Name</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Area (m²)</th>
                <th className="py-3 px-4">Inspection ID</th>
                <th className="py-3 px-4">Date Logged</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading database defects...</td></tr>
              ) : defects.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">No defect records found matching criteria.</td></tr>
              ) : (
                defects.map((def) => (
                  <tr key={def.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{def.class_name || 'Infrastructure Defect'}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">{Math.round((def.confidence || 0.9) * 100)}%</td>
                    <td className="py-3 px-4 text-slate-700">{def.area_sq_m || 0.35} m²</td>
                    <td className="py-3 px-4 font-mono text-slate-500 truncate max-w-[140px]">{def.inspection_id}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(def.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleStatusChange(def.id, 'RESOLVED')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                      >
                        Update Status
                      </button>
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
