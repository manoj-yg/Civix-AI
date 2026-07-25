import React, { useState, useEffect } from 'react';
import { Mail, Database, Save, CheckCircle2, ShieldCheck, Server } from 'lucide-react';
import axios from 'axios';

export default function SettingsView() {
  const [config, setConfig] = useState({
    smtp_server: 'smtp.gmail.com',
    smtp_port: 587,
    sender_email: '',
    sender_password: '',
    recipient_email: '',
    enable_email: false,
    mongo_uri: '',
    enable_mongo: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/config');
        setConfig(res.data);
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.post('/api/config', config);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      alert('Failed to save config: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            System & Notification Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure SMTP credentials for automated damage alert emails and MongoDB Atlas cloud syncing
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Email Notification Configuration */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-200">Email Alerts (SMTP)</h3>
                <p className="text-xs text-slate-400">Send instant damage report notifications to maintenance teams</p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enable_email}
                onChange={(e) => setConfig({ ...config, enable_email: e.target.checked })}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-dark-800 w-4 h-4"
              />
              Enable Email Dispatch
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">SMTP Host Server</label>
              <input
                type="text"
                value={config.smtp_server}
                onChange={(e) => setConfig({ ...config, smtp_server: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full bg-dark-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">SMTP Port</label>
              <input
                type="number"
                value={config.smtp_port}
                onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) || 587 })}
                placeholder="587"
                className="w-full bg-dark-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Sender Email Address</label>
              <input
                type="email"
                value={config.sender_email}
                onChange={(e) => setConfig({ ...config, sender_email: e.target.value })}
                placeholder="alert-bot@example.com"
                className="w-full bg-dark-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Sender App Password</label>
              <input
                type="password"
                value={config.sender_password}
                onChange={(e) => setConfig({ ...config, sender_password: e.target.value })}
                placeholder="••••••••••••••••"
                className="w-full bg-dark-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-400 block mb-1">Recipient Notification Email</label>
              <input
                type="email"
                value={config.recipient_email}
                onChange={(e) => setConfig({ ...config, recipient_email: e.target.value })}
                placeholder="department-head@cityrepairs.gov"
                className="w-full bg-dark-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* MongoDB Cloud Database Configuration */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-200">MongoDB Atlas Integration</h3>
                <p className="text-xs text-slate-400">Sync all incidents to a centralized MongoDB cluster</p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enable_mongo}
                onChange={(e) => setConfig({ ...config, enable_mongo: e.target.checked })}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-dark-800 w-4 h-4"
              />
              Enable MongoDB Sync
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">MongoDB Atlas Connection URI</label>
            <input
              type="password"
              value={config.mongo_uri}
              onChange={(e) => setConfig({ ...config, mongo_uri: e.target.value })}
              placeholder="mongodb+srv://<user>:<password>@cluster.mongodb.net/road_damage_db"
              className="w-full bg-dark-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              If disabled or unconfigured, incidents are automatically persisted to local JSON store (`data/incidents.json`).
            </p>
          </div>
        </div>

        {/* Action Button & Toast */}
        <div className="flex items-center justify-between">
          {savedSuccess ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved successfully!
            </span>
          ) : (
            <span></span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-500/20"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
