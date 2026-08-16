import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, MapPin, AlertTriangle, Clock, ShieldCheck, ChevronRight, Camera, Heart, CheckCircle2, Navigation } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { inspectionApi } from '../../api/inspection.api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';

export const FieldHome = () => {
  const { user } = useAuth();
  const [recentInspections, setRecentInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946, accuracy: 5 });

  const isCitizen = user?.role === 'CITIZEN' || !user?.role || user?.role === 'PUBLIC';

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }),
        (err) => console.log('Location error:', err),
        { enableHighAccuracy: true }
      );
    }

    const fetchRecent = async () => {
      try {
        const res = await inspectionApi.getInspections({ limit: 5 });
        const list = res.data || res.items || (Array.isArray(res) ? res : []);
        setRecentInspections(list);
      } catch (err) {
        console.error('Failed to load recent inspections:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, []);

  return (
    <div className="space-y-5">
      {/* Primary Banner (Tailored for Citizen vs Inspector) */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
              {isCitizen ? 'Public Citizen Portal' : 'Field Inspector Workspace'}
            </span>
            <h2 className="text-xl font-bold mt-1">
              Hello, {user?.full_name || (isCitizen ? 'Citizen Reporter' : 'Inspector')}
            </h2>
            <p className="text-xs text-blue-100 mt-1 max-w-[260px]">
              {isCitizen
                ? 'Report a pothole, broken streetlight, or footpath hazard in your neighborhood.'
                : 'Ready to capture & analyze municipal infrastructure defects?'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
            {isCitizen ? <Heart className="w-6 h-6 text-red-300 fill-red-300" /> : <Camera className="w-6 h-6 text-white" />}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Link to="/field/scan" className="block">
            <Button
              size="lg"
              fullWidth
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 shadow-md border-0 text-base"
              icon={Camera}
            >
              Start Real-Time Video Defect Scanner
            </Button>
          </Link>

          <Link to="/field/new" className="block">
            <Button
              size="md"
              fullWidth
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold py-2 text-xs"
              icon={PlusCircle}
            >
              {isCitizen ? 'Report an Issue (Photo Upload)' : 'Manual Inspection Upload'}
            </Button>
          </Link>
        </div>

      </div>

      {/* Current Location & GPS Accuracy Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Neighborhood Location Tag</p>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
              {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
          ±{location.accuracy}m GPS Fix
        </span>
      </div>

      {/* Citizen Transparency & Blockchain Trust Card */}
      {isCitizen && (
        <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Public Blockchain Transparency Guarantee</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Every citizen report is logged to Polygon Amoy blockchain. Municipal authorities cannot delete or hide reported issues.
          </p>
        </div>
      )}

      {/* Recent Reported Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {isCitizen ? 'My Reported Neighborhood Issues' : 'Recent Field Activity'}
          </h3>
          <Link to="/field/history" className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500">Loading reported issues...</div>
        ) : recentInspections.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No issues reported yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tap 'Report an Issue' to capture infrastructure problems.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentInspections.map((insp) => (
              <Link
                key={insp.id}
                to={`/field/inspections/${insp.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between hover:border-blue-400 transition-colors shadow-2xs block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-600 uppercase">
                    {insp.asset_type?.slice(0, 2) || 'RD'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">{insp.asset_type || 'Road'}</span>
                      <StatusBadge status={insp.status} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(insp.captured_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <SeverityBadge level={insp.severity_assessment?.severity_level || 'LOW'} />
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
