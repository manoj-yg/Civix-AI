import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Search, Building2 } from 'lucide-react';
import { assetApi } from '../../api/asset.api';
import { formatDate } from '../../utils/formatters';

export const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  useEffect(() => {
    fetchAssets();
  }, [selectedType]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = selectedType !== 'ALL' ? { asset_type: selectedType.toLowerCase() } : {};
      const res = await assetApi.getAssets(params);
      const list = res.data || res.items || (Array.isArray(res) ? res : []);
      setAssets(list);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = assets.filter((a) => {
    const term = search.toLowerCase();
    return (a.name || '').toLowerCase().includes(term) || (a.id || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-5 font-sans">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Infrastructure Asset Management</h1>
        <p className="text-xs text-slate-500">Live inventory tracking for Roads, Bridges, Flyovers, Streetlights & Footpaths</p>
      </div>

      {/* Filter Bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Asset ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Infrastructure Types</option>
            <option value="ROAD">Roads</option>
            <option value="BRIDGE">Bridges</option>
            <option value="FLYOVER">Flyovers</option>
            <option value="STREETLIGHT">Streetlights</option>
            <option value="FOOTPATH">Footpaths</option>
          </select>
        </div>
      </Card>

      {/* Asset Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Name / Location</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Ward / Zone</th>
                <th className="py-3 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading database assets...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">No infrastructure assets in database.</td></tr>
              ) : (
                filtered.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{asset.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{asset.name || 'Municipal Infrastructure'}</td>
                    <td className="py-3 px-4 capitalize font-medium">{asset.asset_type}</td>
                    <td className="py-3 px-4 text-slate-500">{asset.ward || asset.zone || 'Zone 4 - Central'}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(asset.created_at)}</td>
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
