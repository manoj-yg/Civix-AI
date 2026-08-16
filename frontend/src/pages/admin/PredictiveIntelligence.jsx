import React from 'react';
import { Card } from '../../components/common/Card';
import { SeverityBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TrendingUp, AlertTriangle, Cpu, ShieldAlert, ChevronRight } from 'lucide-react';

export const PredictiveIntelligence = () => {
  const predictions = [
    {
      assetId: 'BRIDGE-1042',
      name: 'Hebbal Flyover Pier 4 Expansion Joint',
      infraType: 'Bridge',
      currentRisk: 72,
      predictedRisk: 88,
      horizon: '30 Days',
      failureProbability: '74%',
      confidence: '89%',
      recommendation: 'Schedule structural tension inspection within 7 days.',
    },
    {
      assetId: 'ROAD-8801',
      name: 'MG Road Corridor Sub-base',
      infraType: 'Road',
      currentRisk: 55,
      predictedRisk: 79,
      horizon: '45 Days',
      failureProbability: '62%',
      confidence: '92%',
      recommendation: 'Apply asphalt resurfacing before monsoon saturation.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Predictive Infrastructure Intelligence</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          LSTM time-series forecasting & XGBoost structural risk deterioration models
        </p>
      </div>

      {/* Disclaimers Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 flex items-start gap-3">
        <Cpu className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200">
          <span className="font-bold">AI Prediction Disclaimer: </span>
          Deterioration scores are probabilistic estimates calculated from structural geometry, traffic velocity, and climate satellite indicators. Use as decision support alongside engineering field validation.
        </div>
      </div>

      {/* Prediction Cards List */}
      <div className="space-y-4">
        {predictions.map((p) => (
          <Card key={p.assetId} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-600">{p.assetId}</span>
                  <span className="text-xs font-semibold text-slate-500 capitalize">({p.infraType})</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{p.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">AI Confidence:</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{p.confidence}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current Risk</span>
                <span className="text-lg font-bold text-amber-600">{p.currentRisk}/100</span>
              </div>

              <div className="bg-red-50/50 dark:bg-red-950/30 p-3 rounded-xl border border-red-100 dark:border-red-900/40">
                <span className="text-red-700 dark:text-red-300 block text-[10px] uppercase font-semibold">Predicted Risk ({p.horizon})</span>
                <span className="text-lg font-bold text-red-600">{p.predictedRisk}/100</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Prediction Horizon</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{p.horizon}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Failure Probability</span>
                <span className="text-sm font-bold text-red-600">{p.failureProbability}</span>
              </div>
            </div>

            <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">AI Action Recommendation</span>
                <p className="font-semibold text-blue-950 dark:text-blue-100 mt-0.5">{p.recommendation}</p>
              </div>
              <Button size="sm" className="shrink-0">
                Schedule Work Order
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
