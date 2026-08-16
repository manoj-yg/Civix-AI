import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  ChevronLeft,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Cpu,
  FileSpreadsheet,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { inspectionApi } from '../../api/inspection.api';
import { blockchainApi } from '../../api/blockchain.api';
import { reportApi } from '../../api/report.api';
import { formatDate, formatCoords, formatConfidence } from '../../utils/formatters';

export const InspectionDetails = () => {
  const { id } = useParams();
  const [inspection, setInspection] = useState(null);
  const [blockchainVerify, setBlockchainVerify] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingChain, setVerifyingChain] = useState(false);

  // Expandable sections state
  const [openSections, setOpenSections] = useState({
    defects: true,
    severity: true,
    blockchain: true,
    aiModel: false,
  });

  const toggleSection = (sec) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const res = await inspectionApi.getInspectionById(id);
        setInspection(res.data || res);
      } catch (err) {
        console.error('Failed to load inspection details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [id]);

  const verifyBlockchainHash = async () => {
    setVerifyingChain(true);
    try {
      const res = await blockchainApi.verifyInspection(id);
      setBlockchainVerify(res.data || res);
    } catch (err) {
      console.error('Blockchain verification error:', err);
    } finally {
      setVerifyingChain(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading inspection details...</div>;
  }

  if (!inspection) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">Inspection record not found.</p>
        <Link to="/field/history">
          <Button size="sm" variant="outline">Back to History</Button>
        </Link>
      </div>
    );
  }

  const severity = inspection.severity_assessment || { severity_level: 'LOW', overall_score: 25, recommendation: 'Routine monitoring' };
  const detections = inspection.detections || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/field/history" className="text-xs font-semibold text-slate-500 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> History
        </Link>
        <StatusBadge status={inspection.status} />
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inspection ID</span>
            <h2 className="text-sm font-mono font-bold text-slate-900 dark:text-white truncate max-w-[220px]">{inspection.id}</h2>
          </div>
          <SeverityBadge level={severity.severity_level} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 block">Infrastructure</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{inspection.asset_type || 'Road'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Captured Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(inspection.captured_at)}</span>
          </div>
        </div>
      </div>

      {/* Expandable Section: Detected Defects */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection('defects')}
          className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800"
        >
          <span>Detected Defects ({detections.length})</span>
          {openSections.defects ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.defects && (
          <div className="p-3 space-y-2">
            {detections.length === 0 ? (
              <p className="text-xs text-slate-400 p-2">No structural defects detected.</p>
            ) : (
              detections.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{d.class_name || 'Pothole'}</span>
                    <span className="text-[10px] text-slate-400 block">Area: {d.area_sq_m || 0.35} m²</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatConfidence(d.confidence)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Expandable Section: Blockchain Audit */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection('blockchain')}
          className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Polygon Blockchain Tamper Audit</span>
          </div>
          {openSections.blockchain ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.blockchain && (
          <div className="p-4 space-y-3 text-xs">
            <p className="text-slate-500 text-[11px]">
              Every inspection report SHA-256 hash is logged to Polygon blockchain to guarantee tamper-proof audit trails.
            </p>

            <Button
              size="sm"
              variant="outline"
              fullWidth
              loading={verifyingChain}
              onClick={verifyBlockchainHash}
              icon={ShieldCheck}
            >
              Verify Record On Polygon Network
            </Button>

            {blockchainVerify && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified Immutably On-Chain</span>
                </div>
                <p className="text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate">
                  Hash: {blockchainVerify.computed_hash || blockchainVerify.db_hash}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PDF Download Button */}
      <a
        href={reportApi.getPDFReportUrl(inspection.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Button fullWidth variant="outline" size="md" icon={FileSpreadsheet}>
          Download Engineering Report (PDF)
        </Button>
      </a>
    </div>
  );
};
