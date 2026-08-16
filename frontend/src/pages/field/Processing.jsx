import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Cpu, ShieldCheck } from 'lucide-react';
import { inspectionApi } from '../../api/inspection.api';

const STAGES = [
  { id: 'upload', label: 'Media Received & Uploaded' },
  { id: 'yolo', label: 'Running Object Defect Detection' },
  { id: 'unet', label: 'Segmenting Damaged Surface Area' },
  { id: 'xgboost', label: 'Evaluating Structural Severity & Risk Score' },
  { id: 'lstm', label: 'Forecasting 30-Day Deterioration Trend' },
  { id: 'blockchain', label: 'Logging Immutably on Polygon Blockchain' },
];

export const Processing = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inspectionId = searchParams.get('inspection_id');
  const jobId = searchParams.get('job_id');

  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!inspectionId) {
      navigate('/field');
      return;
    }

    let interval;
    let stageCounter = 0;

    // Increment stage visual indicator
    interval = setInterval(() => {
      stageCounter += 1;
      if (stageCounter < STAGES.length) {
        setCurrentStage(stageCounter);
      }
    }, 1800);

    // Poll backend job state
    const pollJob = async () => {
      try {
        if (jobId) {
          const res = await inspectionApi.getJobStatus(jobId);
          if (res.status === 'COMPLETED') {
            clearInterval(interval);
            navigate(`/field/result?inspection_id=${inspectionId}`);
            return;
          }
          if (res.status === 'FAILED') {
            clearInterval(interval);
            setError(res.error || 'AI pipeline processing failed.');
            return;
          }
        }
      } catch {
        // Fallback timer auto-complete if job API unpolled
      }
    };

    const pollTimer = setInterval(pollJob, 2000);

    // Direct transition timeout fallback
    const timeout = setTimeout(() => {
      clearInterval(interval);
      clearInterval(pollTimer);
      navigate(`/field/result?inspection_id=${inspectionId}`);
    }, 9000);

    return () => {
      clearInterval(interval);
      clearInterval(pollTimer);
      clearTimeout(timeout);
    };
  }, [inspectionId, jobId, navigate]);

  if (error) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-red-200 rounded-2xl my-8">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-red-900 dark:text-red-200">Processing Error</h3>
        <p className="text-xs text-red-600 dark:text-red-300 mt-1 mb-4">{error}</p>
        <button
          onClick={() => navigate('/field/new')}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
        >
          Try New Inspection
        </button>
      </div>
    );
  }

  return (
    <div className="py-10 px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto text-blue-600">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Executing AI Inspection Pipeline</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unified Multi-Model Pipeline Processing</p>
      </div>

      {/* Stage Progress List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-left space-y-3 shadow-xs">
        {STAGES.map((st, idx) => {
          const isDone = idx < currentStage;
          const isCurrent = idx === currentStage;
          return (
            <div key={st.id} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
              )}
              <span
                className={`text-xs font-medium ${
                  isDone
                    ? 'text-slate-800 dark:text-slate-200'
                    : isCurrent
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
