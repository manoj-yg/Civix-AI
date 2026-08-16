import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { StatusBadge, SeverityBadge } from '../../components/common/Badge';
import { maintenanceApi } from '../../api/maintenance.api';
import { formatDate } from '../../utils/formatters';

export const Maintenance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const res = await maintenanceApi.getMaintenanceRecords();
      const list = res.data || res.items || (Array.isArray(res) ? res : []);
      setRecords(list);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Maintenance Work Order Dispatch</h1>
        <p className="text-xs text-slate-500">Track assigned repair work orders, due dates, estimated costs, and completion status</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Work Order ID</th>
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Defect Issue</th>
                <th className="py-3 px-4">Assigned Team</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Est. Cost</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading work orders...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">No active maintenance work orders in database.</td></tr>
              ) : (
                records.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{m.id}</td>
                    <td className="py-3 px-4 font-semibold text-blue-600">{m.asset_id || m.asset}</td>
                    <td className="py-3 px-4 font-medium">{m.defect || 'Road Resurfacing'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{m.assigned_team || 'Zone 4 Asphalt Crew'}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(m.due_date)}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{m.cost || '$1,200'}</td>
                    <td className="py-3 px-4"><StatusBadge status={m.status} /></td>
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
