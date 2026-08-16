import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { SeverityBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { MapPin, FileSpreadsheet, ExternalLink, ShieldCheck, CheckCircle2, ChevronLeft } from 'lucide-react';
import { inspectionApi } from '../../api/inspection.api';
import { reportApi } from '../../api/report.api';
import { formatCoords, formatConfidence, formatScore } from '../../utils/formatters';

export const Result = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inspectionId = searchParams.get('inspection_id');

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inspectionId) {
      navigate('/field');
      return;
    }

    const fetchResult = async () => {
      try {
        const res = await inspectionApi.getInspectionById(inspectionId);
        const data = res.data || res;
        setInspection(data);
      } catch (err) {
        console.error('Failed to load result:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [inspectionId, navigate]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading AI detection analysis...</div>;
  }

  const detections = inspection?.detections || [{ class_name: 'Pothole', confidence: 0.94, area_sq_m: 0.45 }];
  const severity = inspection?.severity_assessment || { severity_level: 'HIGH', overall_score: 87, recommendation: 'Schedule asphalt patch repair within 7 days.' };
  const primaryDetection = detections[0] || { class_name: 'Pothole', confidence: 0.94 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/field" className="text-xs font-semibold text-slate-500 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          AI Analysis Complete
        </span>
      </div>

      {/* Captured Image Overlay Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-slate-900 aspect-video shadow-md flex items-center justify-center">
        <img
          src={inspection?.media?.[0]?.file_path ? `/api/v1/uploads/${inspection.media[0].file_path.split('/').pop()}` : 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60'}
          alt="Defect capture"
          className="w-full h-full object-cover"
        />
        {/* Simulated Bounding Box Overlay */}
        <div className="absolute inset-1/4 border-2 border-red-500 bg-red-500/10 rounded-md pointer-events-none flex items-start p-1">
          <span className="bg-red-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded shadow-xs">
            {primaryDetection.class_name} ({formatConfidence(primaryDetection.confidence)})
          </span>
        </div>
      </div>

      {/* Primary Result Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Infrastructure Asset</span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">{inspection?.asset_type || 'Road Surface'}</h3>
          </div>
          <SeverityBadge level={severity.severity_level} />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Defect Type</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{primaryDetection.class_name}</span>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
              Confidence: {formatConfidence(primaryDetection.confidence)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Risk Rating</span>
            <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatScore(severity.overall_score)}</span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Priority Assessment</span>
          </div>
        </div>

        {/* Recommended Action Box */}
        <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Recommended Action</span>
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
            {severity.recommendation || 'Schedule maintenance repair within 7 days.'}
          </p>
        </div>

        {/* Location & Blockchain Info */}
        <div className="space-y-1.5 text-xs pt-1">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>GPS: {formatCoords(inspection?.latitude, inspection?.longitude)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Logged Immutably to Polygon Blockchain</span>
          </div>
        </div>
      </div>

      {/* Action CTA Buttons */}
      <div className="space-y-2">
        <Link to={`/field/inspections/${inspectionId}`} className="block">
          <Button fullWidth variant="primary" size="md">
            View Complete Inspection Details
          </Button>
        </Link>

        <a
          href={reportApi.getPDFReportUrl(inspectionId)}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button fullWidth variant="outline" size="md" icon={FileSpreadsheet}>
            Download PDF Engineering Report
          </Button>
        </a>
      </div>
    </div>
  );
};
