import React, { useState } from 'react';
import { Smartphone, Wifi, Camera, Database, Save } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const FieldSettings = () => {
  const [offlineSync, setOfflineSync] = useState(true);
  const [highResCamera, setHighResCamera] = useState(true);
  const [autoUpload, setAutoUpload] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Field App Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Offline queue & camera preferences</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-4 h-4 text-blue-600" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">Offline Mode Ready</span>
              <span className="text-[10px] text-slate-400">Queue captures when offline</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={offlineSync}
            onChange={(e) => setOfflineSync(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-2.5">
            <Camera className="w-4 h-4 text-purple-600" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">High Resolution Mode</span>
              <span className="text-[10px] text-slate-400">Capture 1080p+ photo detail</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={highResCamera}
            onChange={(e) => setHighResCamera(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">Auto Upload On Wi-Fi</span>
              <span className="text-[10px] text-slate-400">Automatically sync pending items</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoUpload}
            onChange={(e) => setAutoUpload(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
        </div>
      </div>

      <Button fullWidth onClick={handleSave} icon={Save}>
        {saved ? 'Settings Saved!' : 'Save Preferences'}
      </Button>
    </div>
  );
};
