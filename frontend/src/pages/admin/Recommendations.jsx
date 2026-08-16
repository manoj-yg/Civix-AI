import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { SeverityBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Lightbulb, CheckCircle2, XCircle, UserPlus, Eye } from 'lucide-react';

export const Recommendations = () => {
  const [items, setItems] = useState([
    {
      id: 'REC-101',
      asset: 'BRIDGE-1042',
      issue: 'High structural crack growth rate detected on Expansion Joint #3.',
      risk: 88,
      priority: 'HIGH',
      recommendation: 'Schedule immediate NDT structural tension inspection and joint re-sealing.',
      reason: 'Crack propagation velocity increased by 42% over 30 days due to heavy truck traffic.',
      date: '2026-08-16',
    },
    {
      id: 'REC-102',
      asset: 'ROAD-8801',
      issue: 'Interconnected alligator cracking across 120m roadway sub-base.',
      risk: 76,
      priority: 'HIGH',
      recommendation: 'Perform cold-milling and asphalt overlay resurfacing.',
      reason: 'Water infiltration risk threatens complete sub-grade structural failure.',
      date: '2026-08-15',
    },
  ]);

  const handleAction = (id, action) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    alert(`Recommendation ${id} ${action}d successfully.`);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI Decision Support & Recommendation Center</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          LLM RAG Reasoning Engine generating prioritized engineering actions
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {item.asset}
                </span>
                <span className="text-xs text-slate-400">{item.date}</span>
              </div>
              <SeverityBadge level={item.priority} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.issue}</h3>
              <div className="mt-2 p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase block">Recommended Engineering Action</span>
                <p className="text-xs font-semibold text-blue-950 dark:text-blue-100 mt-0.5">{item.recommendation}</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white block mb-0.5">AI Reasoning Context:</span>
              <p>{item.reason}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" icon={Eye}>
                View Evidence
              </Button>
              <Button size="sm" variant="secondary" icon={XCircle} onClick={() => handleAction(item.id, 'Reject')}>
                Reject
              </Button>
              <Button size="sm" variant="primary" icon={CheckCircle2} onClick={() => handleAction(item.id, 'Approve')}>
                Approve & Dispatch Work Order
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
