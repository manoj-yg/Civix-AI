import React from 'react';
import { Card } from '../../components/common/Card';
import { Boxes, CheckCircle2, Cpu } from 'lucide-react';

export const ModelMonitoring = () => {
  const models = [
    {
      name: 'YOLOv8 / YOLOv9 Object Detector',
      type: 'Defect Boundary Detection',
      version: 'v2.1.0',
      accuracy: '94.2%',
      precision: '92.8%',
      recall: '95.1%',
      map: '93.6%',
      status: 'ACTIVE',
    },
    {
      name: 'U-Net Semantic Segmentor',
      type: 'Surface Area & Depth Masking',
      version: 'v1.4.0',
      accuracy: '91.5%',
      precision: '90.2%',
      recall: '92.4%',
      map: '90.8%',
      status: 'ACTIVE',
    },
    {
      name: 'XGBoost Risk Evaluator',
      type: 'Structural Risk Scoring (0-100)',
      version: 'v3.0.0',
      accuracy: '96.1%',
      precision: '95.4%',
      recall: '96.8%',
      map: '96.0%',
      status: 'ACTIVE',
    },
    {
      name: 'LSTM Time-Series Predictor',
      type: '30-Day Deterioration Forecasting',
      version: 'v1.8.0',
      accuracy: '89.4%',
      precision: '88.1%',
      recall: '90.5%',
      map: '88.9%',
      status: 'ACTIVE',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI Model Performance & Health Monitoring</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Validation metrics (mAP, Precision, Recall, F1) across detection, segmentation, severity & forecasting models
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((m) => (
          <Card key={m.name} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                  {m.version}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{m.name}</h3>
                <p className="text-xs text-slate-500">{m.type}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {m.status}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Accuracy</span>
                <span className="font-bold text-slate-900 dark:text-white">{m.accuracy}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Precision</span>
                <span className="font-bold text-slate-900 dark:text-white">{m.precision}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Recall</span>
                <span className="font-bold text-slate-900 dark:text-white">{m.recall}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">mAP@50</span>
                <span className="font-bold text-emerald-600">{m.map}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
