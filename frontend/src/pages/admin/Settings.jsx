import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Settings as SettingsIcon, Save, Database, Shield, Cpu, RefreshCw } from 'lucide-react';

export const Settings = () => {
  const [modelVersion, setModelVersion] = useState('yolov8');
  const [blockchainEnabled, setBlockchainEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Platform Settings & Control Toggle</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure model rollback controls, database connections, and blockchain integration modes
        </p>
      </div>

      <Card title="AI Pipeline Version Rollback Toggle">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Active Model Architecture Version (`MODEL_VERSION`)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModelVersion('yolov8')}
                className={`p-3.5 rounded-xl border text-left font-semibold transition-all ${
                  modelVersion === 'yolov8'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-bold text-sm">YOLOv8 Standard Pipeline</div>
                <p className="text-[11px] font-normal text-slate-500 mt-0.5">Fast default single-stage object detection</p>
              </button>

              <button
                type="button"
                onClick={() => setModelVersion('v2')}
                className={`p-3.5 rounded-xl border text-left font-semibold transition-all ${
                  modelVersion === 'v2'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-bold text-sm">V2 Upgraded Multi-Model Pipeline</div>
                <p className="text-[11px] font-normal text-slate-500 mt-0.5">YOLO + U-Net + Feature Eng + XGBoost + LSTM + LLM</p>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">Polygon Blockchain Audit Logging</span>
              <span className="text-[11px] text-slate-400">Log SHA-256 canonical hash of every inspection report onto Polygon</span>
            </div>
            <input
              type="checkbox"
              checked={blockchainEnabled}
              onChange={(e) => setBlockchainEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>

          <div className="pt-2">
            <Button onClick={handleSave} icon={Save}>
              {saved ? 'Configuration Saved!' : 'Save System Settings'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
