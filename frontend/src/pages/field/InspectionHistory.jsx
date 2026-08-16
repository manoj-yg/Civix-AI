import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Clock } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { inspectionApi } from '../../api/inspection.api';
import { formatDate } from '../../utils/formatters';

export const InspectionHistory = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  useEffect(() => {
    fetchInspections();
  }, [selectedType]);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedType !== 'ALL') params.asset_type = selectedType.toLowerCase();

      const res = await inspectionApi.getInspections(params);
      const list = res.data || res.items || (Array.isArray(res) ? res : []);
      
      // Filter out duplicate inspection IDs
      const uniqueItems = Array.from(new Map(list.map(item => [item.id, item])).values());
      setInspections(uniqueItems);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setInspections([]);
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
    <div className="space-y-4 font-sans">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Inspection & Incident History</h2>
        <p className="text-xs text-slate-500">Search and track all real database inspection records</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search by ID or infrastructure..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter Bars */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {['ALL', 'ROAD', 'BRIDGE', 'FLYOVER', 'STREETLIGHT', 'FOOTPATH'].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
              selectedType === t
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* History List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading history...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No inspection records found in database.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Link
              key={item.id}
              to={`/field/inspections/${item.id}`}
              className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-blue-400 transition-colors shadow-2xs block"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center font-bold text-xs text-blue-600 uppercase">
                  {item.asset_type?.slice(0, 2) || 'RD'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 capitalize">{item.asset_type || 'Road'}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.captured_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <SeverityBadge level={item.severity_assessment?.severity_level || 'LOW'} />
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
