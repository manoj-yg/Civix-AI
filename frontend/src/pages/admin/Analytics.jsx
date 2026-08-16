import React from 'react';
import { Card } from '../../components/common/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

const infraData = [
  { name: 'Roads', defects: 84 },
  { name: 'Bridges', defects: 22 },
  { name: 'Flyovers', defects: 35 },
  { name: 'Streetlights', defects: 19 },
  { name: 'Footpaths', defects: 42 },
];

const severityData = [
  { name: 'Low', value: 210, color: '#10b981' },
  { name: 'Medium', value: 92, color: '#f59e0b' },
  { name: 'High', value: 38, color: '#f97316' },
  { name: 'Critical', value: 12, color: '#dc2626' },
];

const timeData = [
  { date: 'Aug 10', defects: 18, resolved: 14 },
  { date: 'Aug 11', defects: 24, resolved: 19 },
  { date: 'Aug 12', defects: 29, resolved: 22 },
  { date: 'Aug 13', defects: 22, resolved: 25 },
  { date: 'Aug 14', defects: 34, resolved: 28 },
  { date: 'Aug 15', defects: 31, resolved: 30 },
  { date: 'Aug 16', defects: 28, resolved: 24 },
];

export const Analytics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Infrastructure Analytics & Health Metrics</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Statistical distribution of public asset defects and resolution trends</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Defects by Infrastructure */}
        <Card title="Defects by Infrastructure Category">
          <div className="h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={infraData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="defects" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Defects by Severity */}
        <Card title="Risk Severity Distribution">
          <div className="h-64 text-xs flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 3: Defects Over Time */}
        <Card title="Defect Capture vs. Resolution Trend (7 Days)" className="lg:col-span-2">
          <div className="h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="defects" stroke="#dc2626" fill="#fca5a5" fillOpacity={0.4} name="Defects Reported" />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="#6ee7b7" fillOpacity={0.4} name="Defects Resolved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
