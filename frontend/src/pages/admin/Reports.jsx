import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FileSpreadsheet, Download, Filter, Calendar } from 'lucide-react';
import { reportApi } from '../../api/report.api';

export const Reports = () => {
  const [infraFilter, setInfraFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [reportType, setReportType] = useState('health');

  const reportTypes = [
    { id: 'health', name: 'Infrastructure Health Summary Report' },
    { id: 'risk', name: 'Critical Risk Assessment & Deterioration Report' },
    { id: 'maintenance', name: 'Maintenance Dispatch & Cost Report' },
    { id: 'blockchain', name: 'Polygon Blockchain Audit Verification Log' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Municipal Engineering Reports</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Generate PDF and JSON engineering reports filtered by infrastructure type and severity
        </p>
      </div>

      <Card title="Report Configuration & PDF Generator">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Select Report Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {reportTypes.map((rt) => (
                <button
                  key={rt.id}
                  onClick={() => setReportType(rt.id)}
                  className={`p-3 rounded-xl border text-left font-semibold transition-all ${
                    reportType === rt.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {rt.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Infrastructure Filter</label>
              <select
                value={infraFilter}
                onChange={(e) => setInfraFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="ALL">All Infrastructure Types</option>
                <option value="road">Roads</option>
                <option value="bridge">Bridges</option>
                <option value="flyover">Flyovers</option>
                <option value="streetlight">Streetlights</option>
                <option value="footpath">Footpaths</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Severity Filter</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="ALL">All Severity Levels</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High Only</option>
                <option value="MEDIUM">Medium Only</option>
                <option value="LOW">Low Only</option>
              </select>
            </div>
          </div>

          <div className="pt-3">
            <a
              href={reportApi.getPDFReportUrl('sample-summary-report')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" icon={Download} fullWidth>
                Generate & Download Engineering PDF Report
              </Button>
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
};
